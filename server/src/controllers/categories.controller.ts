import { Request, Response } from "express";
import { db } from "../db/dbConnection";
import { categories } from "../db/schema/categories.schema";
import { eq, isNull, and, sql, inArray } from "drizzle-orm";
import redisClient from "../config/redis";
import { ZohoCategoryService } from "../services/ZohoServices/zohoCategory.service";
import { ZohoService } from "../services/zoho.service";
import axios from "axios";
import { ZOHO_ENV } from "../config/Zoho";
import { products } from "../db/schema";

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
// Add this function to invalidate product caches
async function invalidateProductsCache() {
  try {
    const keys = await redisClient.keys("products:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`🗑️ Cleared ${keys.length} product cache keys`);
    }
  } catch (error) {
    console.error("Failed to invalidate product cache:", error);
  }
}
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
        removeImage?: string;
      };

      if (parentCategoryId === id) {
        return res.status(400).json({
          success: false,
          message: "Category cannot be its own parent",
        });
      }
      const [currentCategory] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);

      if (!currentCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const oldCategoryName = currentCategory.name;

      // ✅ Get existing category to get old name for Zoho update
      const [existingCategory] = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
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
        imageData = null;
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

      const zohoCategoryService = new ZohoCategoryService();
      let itemsUpdated = 0;
      // ✅ Use transaction
      const updatedCategory = await db.transaction(async (tx) => {
        // 🔹 Step 1: Update category in Zoho if name changed
        if (name && name !== oldCategoryName) {
          const itemsUpdated =
            await zohoCategoryService.updateCategoryInZohoItems(
              oldCategoryName,
              name
            );
          if (itemsUpdated === null) {
            throw new Error("Failed to update category in Zoho");
          }
        }

        // 🔹 Step 2: Update local category
        const [updated] = await tx
          .update(categories)
          .set(updateData)
          .where(eq(categories.id, id))
          .returning();

        if (!updated) {
          throw new Error("Failed to update category in database");
        }

        // 🔹 Step 3: Update all related products' subcategoryName if name changed
        if (name && name !== oldCategoryName) {
          await tx
            .update(products)
            .set({ subcategoryName: name })
            .where(eq(products.subcategoryId, id));
        }

        return updated;
      });

      // ✅ Step 4: Clear caches after successful commit
      await Promise.all([
        invalidateCategoryCaches(parentCategoryId ?? undefined),
        invalidateCategoryCaches(id),
        invalidateProductsCache(),
      ]);

      return res.status(200).json({
        success: true,
        message: "Category updated successfully",
        category: updatedCategory,
      });
    } catch (error: any) {
      console.error("updateCategory error:", error);
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
  // ========================================
  // 3. UPDATED CONTROLLER: deleteCategory
  // ========================================

  static async deleteCategory(req: Request, res: Response) {
    const { id } = req.params;

    try {
      // ✅ Start transaction
      const result = await db.transaction(async (tx) => {
        // 1️⃣ Get existing category
        const [existingCategory] = await tx
          .select({
            id: categories.id,
            name: categories.name,
            zohoGroupId: categories.zohoGroupId,
          })
          .from(categories)
          .where(eq(categories.id, id))
          .limit(1);

        if (!existingCategory) {
          throw new Error("Category not found"); // triggers rollback
        }

        const categoryName = existingCategory.name;

        // 2️⃣ Get child categories
        const childCategories = await tx
          .select({
            id: categories.id,
            name: categories.name,
            zohoGroupId: categories.zohoGroupId,
          })
          .from(categories)
          .where(eq(categories.parentCategoryId, id));

        const childIds = childCategories.map((c) => c.id);
        const allCategoriesToRemove = [
          categoryName,
          ...childCategories.map((c) => c.name),
        ];
        const allZohoGroupIds = [
          existingCategory.zohoGroupId,
          ...childCategories.map((c) => c.zohoGroupId),
        ].filter(Boolean);

        // 3️⃣ Remove parent + child categories from products in DB
        await tx
          .update(products)
          .set({ subcategoryId: null, subcategoryName: null })
          .where(eq(products.subcategoryId, id));

        if (childIds.length > 0) {
          await tx
            .update(products)
            .set({ subcategoryId: null, subcategoryName: null })
            .where(inArray(products.subcategoryId, childIds));
        }

        // 4️⃣ Zoho operations - if any fail, throw to rollback DB
        const zohoCategoryService = new ZohoCategoryService();
        let itemsUpdatedInZoho = 0;

        for (const catName of allCategoriesToRemove) {
          try {
            const updated =
              await zohoCategoryService.removeCategoryFromZohoItems(catName);
            itemsUpdatedInZoho += updated;
          } catch (error) {
            if (error instanceof Error) {
              throw new Error(
                `Failed to remove category "${catName}" from Zoho items: ${error.message}`
              );
            }
            throw error;
          }
        }

        // Delete Zoho item groups
        const zohoService = new ZohoService();
        for (const zohoGroupId of allZohoGroupIds) {
          try {
            const accessToken = await zohoService.getValidAccessToken();
            await axios.delete(
              `${ZOHO_ENV.BOOKS_API}/itemgroups/${zohoGroupId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
              { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
            );
          } catch (error: any) {
            throw new Error(
              `Failed to delete Zoho group "${zohoGroupId}": ${
                error.response?.data?.message || error.message
              }`
            );
          }
        }

        // 5️⃣ Delete child categories from DB
        if (childIds.length > 0) {
          await tx.delete(categories).where(inArray(categories.id, childIds));
        }

        // 6️⃣ Delete parent category
        await tx.delete(categories).where(eq(categories.id, id));

        return { categoryName, itemsUpdatedInZoho };
      });

      // ✅ Cache clearing after successful transaction
      try {
        await Promise.all([
          invalidateCategoryCaches(id),
          invalidateProductsCache(),
        ]);
      } catch (cacheError) {
        console.warn("Cache clearing failed", cacheError);
      }

      return res.status(200).json({
        success: true,
        message: `Category "${result.categoryName}" and its subcategories deleted successfully`,
        itemsUpdatedInZoho: result.itemsUpdatedInZoho,
      });
    } catch (error) {
      console.error("deleteCategory error:", error);
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
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
