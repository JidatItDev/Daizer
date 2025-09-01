import { Request, Response } from "express";
import { db } from "../db/dbConnection";
import { categories } from "../db/schema/categories.schema";
import { eq, isNull, and, sql } from "drizzle-orm";
import redisClient from "../config/redis";

interface S3File extends Express.Multer.File {
  location: string; // AWS S3 gives this
  key: string;
}

export interface MulterRequest extends Request {
  file?: S3File;
}

interface S3File extends Express.Multer.File {
  location: string; // AWS S3 gives this
  key: string;
}

export interface MulterRequest extends Request {
  file?: S3File;
}
// ---- Cache helpers ----
const invalidateCategoryCaches = async (categoryId?: string) => {
  try {
    const patterns = [
      "categories:parents:page:*",
      "categories:subs:page:*",
      "categories:tree",
      "categories:subOf:*",
      "categories:all:page:*",
    ];
    if (categoryId) patterns.push(`categories:subOf:${categoryId}`);

    // collect & delete
    const allKeysArrays = await Promise.all(
      patterns.map((p) => redisClient.keys(p))
    );
    const keys = allKeysArrays.flat();
    if (keys.length) await redisClient.del(keys);
  } catch (e) {
    console.error("Failed invalidating category caches:", e);
  }
};

// ---- Controller ----
class CategoryController {
  // Create Parent Category
  static async createParentCategory(req: MulterRequest, res: Response) {
    try {
      const { name } = req.body;

      let imageData: { name: string; url: string } | undefined;

      if (req.file) {
        imageData = {
          name: req.file.originalname,
          url: req.file.location,
        };
      }

      const [row] = await db
        .insert(categories)
        .values({
          name,
          parentCategoryId: null,
          ...(imageData && { image: imageData }),
        })
        .returning();

      await invalidateCategoryCaches();

      return res.status(201).json({
        success: true,
        message: "Parent category created",
        category: row,
      });
    } catch (error) {
      console.error("createParentCategory error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Create Subcategory
  static async createSubcategory(req: MulterRequest, res: Response) {
    try {
      const { name, parentCategoryId } = req.body;

      // Ensure parent exists
      const [parent] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, parentCategoryId))
        .limit(1);

      if (!parent) {
        return res.status(404).json({
          success: false,
          message: "Parent category not found",
        });
      }

      let imageData: { name: string; url: string } | undefined;

      if (req.file) {
        imageData = {
          name: req.file.originalname,
          url: req.file.location,
        };
      }

      const [row] = await db
        .insert(categories)
        .values({
          name,
          parentCategoryId,
          ...(imageData && { image: imageData }),
        })
        .returning();

      await invalidateCategoryCaches(parentCategoryId);

      return res.status(201).json({
        success: true,
        message: "Subcategory created",
        category: row,
      });
    } catch (error) {
      console.error("createSubcategory error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update Category
  static async updateCategory(req: MulterRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, parentCategoryId, removeImage } = req.body as {
        name?: string;
        parentCategoryId?: string | null;
        removeImage?: string; // "true" if user wants to remove image
      };

      if (parentCategoryId === id) {
        return res.status(400).json({
          success: false,
          message: "Category cannot be its own parent",
        });
      }

      // If moving under a parent, ensure parent exists
      if (parentCategoryId) {
        const [parent] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.id, parentCategoryId))
          .limit(1);
        if (!parent) {
          return res.status(404).json({
            success: false,
            message: "New parent category not found",
          });
        }
      }

      let imageData: { name: string; url: string } | null | undefined;

      if (removeImage === "true") {
        imageData = null; // Explicitly set to null to remove image
      } else if (req.file) {
        imageData = {
          name: req.file.originalname,
          url: req.file.location,
        };
      }

      const updateData: any = {
        ...(name !== undefined && { name }),
        ...(parentCategoryId !== undefined && { parentCategoryId }),
      };

      if (imageData !== undefined) {
        updateData.image = imageData;
      }

      const [updated] = await db
        .update(categories)
        .set(updateData)
        .where(eq(categories.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      await invalidateCategoryCaches(parentCategoryId ?? undefined);
      await invalidateCategoryCaches(id);

      return res.status(200).json({
        success: true,
        message: "Category updated",
        category: updated,
      });
    } catch (error) {
      console.error("updateCategory error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
  static async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [deleted] = await db
        .delete(categories)
        .where(eq(categories.id, id))
        .returning({ id: categories.id });

      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }

      await invalidateCategoryCaches(id);

      return res
        .status(200)
        .json({ success: true, message: "Category deleted" });
    } catch (error) {
      console.error("deleteCategory error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getAllCategories(req: Request, res: Response) {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const offset = (page - 1) * limit;

      const cacheKey = `categories:all:page:${page}:limit:${limit}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) return res.status(200).json(JSON.parse(cached));

      const [rows, countRes] = await Promise.all([
        db
          .select()
          .from(categories)
          .orderBy(categories.createdAt)
          .limit(limit)
          .offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(categories),
      ]);
      const total = Number(countRes[0].count);

      const response = {
        success: true,
        categories: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      await redisClient.setEx(cacheKey, 300, JSON.stringify(response));
      return res.status(200).json(response);
    } catch (error) {
      console.error("getAllCategories error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getParentCategories(req: Request, res: Response) {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const offset = (page - 1) * limit;

      const cacheKey = `categories:parents:page:${page}:limit:${limit}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) return res.status(200).json(JSON.parse(cached));

      const [rows, countRes] = await Promise.all([
        db
          .select()
          .from(categories)
          .where(isNull(categories.parentCategoryId))
          .orderBy(categories.createdAt)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(categories)
          .where(isNull(categories.parentCategoryId)),
      ]);
      const total = Number(countRes[0].count);

      const response = {
        success: true,
        categories: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      await redisClient.setEx(cacheKey, 300, JSON.stringify(response));
      return res.status(200).json(response);
    } catch (error) {
      console.error("getParentCategories error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getAllSubcategories(req: Request, res: Response) {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const offset = (page - 1) * limit;

      const cacheKey = `categories:subs:page:${page}:limit:${limit}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) return res.status(200).json(JSON.parse(cached));

      const [rows, countRes] = await Promise.all([
        db
          .select()
          .from(categories)
          .where(sql`${categories.parentCategoryId} IS NOT NULL`)
          .orderBy(categories.createdAt)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(categories)
          .where(sql`${categories.parentCategoryId} IS NOT NULL`),
      ]);
      const total = Number(countRes[0].count);

      const response = {
        success: true,
        subcategories: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      await redisClient.setEx(cacheKey, 300, JSON.stringify(response));
      return res.status(200).json(response);
    } catch (error) {
      console.error("getAllSubcategories error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // Subcategories of a specific parent
  static async getSubcategoriesOfCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const offset = (page - 1) * limit;

      const cacheKey = `categories:subOf:${id}:page:${page}:limit:${limit}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) return res.status(200).json(JSON.parse(cached));

      const [rows, countRes] = await Promise.all([
        db
          .select()
          .from(categories)
          .where(eq(categories.parentCategoryId, id))
          .orderBy(categories.createdAt)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(categories)
          .where(eq(categories.parentCategoryId, id)),
      ]);
      const total = Number(countRes[0].count);

      const response = {
        success: true,
        subcategories: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      await redisClient.setEx(cacheKey, 300, JSON.stringify(response));
      return res.status(200).json(response);
    } catch (error) {
      console.error("getSubcategoriesOfCategory error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // Tree: all parents with nested subcategories
  static async getCategoriesTree(_req: Request, res: Response) {
    try {
      const cacheKey = "categories:tree";
      const cached = await redisClient.get(cacheKey);
      if (cached) return res.status(200).json(JSON.parse(cached));

      // fetch all once
      const all = await db.select().from(categories);

      // group into parent -> children
      const map = new Map<string, any>();
      const parents: any[] = [];

      for (const c of all) {
        map.set(c.id, { ...c, subcategories: [] });
      }
      for (const c of all) {
        if (c.parentCategoryId) {
          const parent = map.get(c.parentCategoryId);
          if (parent) parent.subcategories.push(map.get(c.id));
        } else {
          parents.push(map.get(c.id));
        }
      }

      const response = { success: true, categories: parents };

      await redisClient.setEx(cacheKey, 600, JSON.stringify(response));
      return res.status(200).json(response);
    } catch (error) {
      console.error("getCategoriesTree error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default CategoryController;
