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
      const result = await db.transaction(async (tx) => {
        // Update in Zoho if name changed
        if (name && name !== existingCategory.name) {
          try {
            itemsUpdated = await zohoCategoryService.updateCategoryInZohoItems(
              oldCategoryName, // ✅ Use actual old name from DB
              name // ✅ New name
            );
          } catch (zohoError) {
            console.warn(
              "⚠️ Could not update category in Zoho (continuing with local update):",
              zohoError
            );
            // Continue with local update even if Zoho fails
          }
        }

        // Update in local database
        const [updated] = await tx
          .update(categories)
          .set(updateData)
          .where(eq(categories.id, id))
          .returning();
        // After updating category
        if (name && name !== existingCategory.name) {
          await tx
            .update(products)
            .set({
              subcategoryName: name,
            })
            .where(eq(products.subcategoryId, id));
        }

        return updated;
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      await Promise.all([
        invalidateCategoryCaches(parentCategoryId ?? undefined),
        invalidateCategoryCaches(id),
        invalidateProductsCache(), // ✅ ADD THIS LINE
      ]);

      return res.status(200).json({
        success: true,
        message: "Category updated",
        category: result,
      });
    } catch (error) {
      console.error("updateCategory error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ========================================
  // 3. UPDATED CONTROLLER: deleteCategory
  // ========================================

  static async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // ✅ Get category details before deleting
      const [existingCategory] = await db
        .select({
          id: categories.id,
          name: categories.name,
          zohoGroupId: categories.zohoGroupId,
        })
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);

      if (!existingCategory) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }

      const categoryName = existingCategory.name;
      console.log(`🗑️ Deleting category: "${categoryName}"`);

      let itemsUpdatedInZoho = 0;

      // ✅ Use transaction
      await db.transaction(async (tx) => {
        // ✅ Step 1: Get all child categories BEFORE deleting
        const childCategories = await tx
          .select({
            id: categories.id,
            name: categories.name,
            zohoGroupId: categories.zohoGroupId,
          })
          .from(categories)
          .where(eq(categories.parentCategoryId, id));

        const childIds = childCategories.map((c) => c.id);

        // ✅ Step 2: Collect all category names (parent + children) to remove from Zoho
        const allCategoriesToRemove = [
          categoryName,
          ...childCategories.map((c) => c.name),
        ];

        console.log(
          `📋 Categories to remove from Zoho:`,
          allCategoriesToRemove
        );

        // ✅ Step 3: Remove parent category from products in DB
        await tx
          .update(products)
          .set({
            subcategoryId: null,
            subcategoryName: null,
          })
          .where(eq(products.subcategoryId, id));

        // ✅ Step 4: Remove child categories from products in DB
        if (childIds.length > 0) {
          await tx
            .update(products)
            .set({
              subcategoryId: null,
              subcategoryName: null,
            })
            .where(inArray(products.subcategoryId, childIds));
        }

        // ✅ Step 5: Remove ALL categories (parent + children) from Zoho items
        try {
          const zohoCategoryService = new ZohoCategoryService();

          // Remove each category from Zoho
          for (const catName of allCategoriesToRemove) {
            const updated =
              await zohoCategoryService.removeCategoryFromZohoItems(catName);
            itemsUpdatedInZoho += updated;
            console.log(
              `✅ Removed "${catName}" from ${updated} items in Zoho`
            );
          }

          console.log(`✅ Total items updated in Zoho: ${itemsUpdatedInZoho}`);
        } catch (zohoError: any) {
          console.warn(
            "⚠️ Could not remove categories from Zoho items:",
            zohoError.message
          );
        }

        // ✅ Step 6: Delete Zoho item groups (parent + children)
        const allZohoGroupIds = [
          existingCategory.zohoGroupId,
          ...childCategories.map((c) => c.zohoGroupId),
        ].filter(Boolean);

        for (const zohoGroupId of allZohoGroupIds) {
          try {
            const accessToken = await new ZohoService().getValidAccessToken();
            await axios.delete(
              `${ZOHO_ENV.BOOKS_API}/itemgroups/${zohoGroupId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
              {
                headers: {
                  Authorization: `Zoho-oauthtoken ${accessToken}`,
                },
              }
            );
            console.log(`✅ Deleted Zoho item group: ${zohoGroupId}`);
          } catch (groupError: any) {
            console.warn(
              "⚠️ Could not delete Zoho item group:",
              groupError.response?.data?.message || groupError.message
            );
          }
        }

        // ✅ Step 7: Delete child categories from database
        if (childIds.length > 0) {
          await tx.delete(categories).where(inArray(categories.id, childIds));
          console.log(`✅ Deleted ${childIds.length} child categories from DB`);
        }

        // ✅ Step 8: Delete parent category from database
        await tx.delete(categories).where(eq(categories.id, id));
        console.log(`✅ Deleted parent category from DB`);
      });

      // ✅ Clear BOTH category AND product caches
      await Promise.all([
        invalidateCategoryCaches(id),
        invalidateProductsCache(), // ✅ ADD THIS LINE
      ]);

      console.log("✅ Cleared all caches");

      return res.status(200).json({
        success: true,
        message: `Category "${categoryName}" and its subcategories deleted successfully`,
        itemsUpdatedInZoho,
      });
    } catch (error: any) {
      console.error("deleteCategory error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
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
