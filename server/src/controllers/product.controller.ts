import { Request, Response } from "express";
import { db } from "../db/dbConnection";
import { products } from "../db/schema/products.schema";
import { pricingGroups } from "../db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import redisClient from "../config/redis";
import { categories } from "../db/schema/categories.schema";

// Helper → Invalidate product caches
const invalidateProductsCache = async () => {
  try {
    const keys = await redisClient.keys("products:page:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log("Cache invalidated for products:", keys);
    }
  } catch (err) {
    console.error("Error invalidating product cache:", err);
  }
};

class ProductController {
  // ✅ Create Product
  static async createProduct(req: Request, res: Response) {
    try {
      const body = req.body || {};
      let { name, description, pricingGroupPrices, subcategoryId } = body;

      // Parse JSON if it's string
      if (typeof pricingGroupPrices === "string") {
        pricingGroupPrices = JSON.parse(pricingGroupPrices);
      }

      // --- Fetch pricing groups with names ---
      const pricingGroupsData = await db
        .select({ id: pricingGroups.id, name: pricingGroups.name })
        .from(pricingGroups)
        .where(inArray(pricingGroups.id, Object.keys(pricingGroupPrices)));

      const enrichedPricingGroups = pricingGroupsData.map((pg) => ({
        id: pg.id,
        name: pg.name,
        price: pricingGroupPrices[pg.id] || 0,
      }));

      // --- Fetch subcategory name ---
      const [subcategory] = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.id, subcategoryId));

      if (!subcategory) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid subcategory" });
      }

      const file = req.file as Express.MulterS3.File;
      const image = file
        ? {
            name: file.originalname,
            url: file.location,
            key: file.key,
            size: file.size,
            mimetype: file.mimetype,
          }
        : null;

      const [newProduct] = await db
        .insert(products)
        .values({
          name,
          description,
          pricingGroupPrices: enrichedPricingGroups,
          subcategoryId: subcategory.id,
          subcategoryName: subcategory.name, // ✅ Added this field
          image,
        })
        .returning();

      await invalidateProductsCache();

      return res.status(201).json({
        success: true,
        message: "Product created successfully",
        product: newProduct,
      });
    } catch (error) {
      console.error("Create product error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // ✅ Update Product
  // ✅ Update Product - FIXED
  static async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      let { name, description, pricingGroupPrices, subcategoryId } = req.body;

      // Parse JSON if it's string (same as createProduct)
      if (typeof pricingGroupPrices === "string") {
        pricingGroupPrices = JSON.parse(pricingGroupPrices);
      }

      // Handle new file upload if provided
      const file = req.file as Express.MulterS3.File;
      const image = file
        ? {
            name: file.originalname,
            url: file.location,
            key: file.key,
            size: file.size,
            mimetype: file.mimetype,
          }
        : undefined;

      // Build update object (only include defined fields)
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (image !== undefined) updateData.image = image;

      // ✅ Process pricingGroupPrices the SAME way as createProduct
      if (pricingGroupPrices !== undefined) {
        // --- Fetch pricing groups with names (SAME AS CREATE) ---
        const pricingGroupsData = await db
          .select({ id: pricingGroups.id, name: pricingGroups.name })
          .from(pricingGroups)
          .where(inArray(pricingGroups.id, Object.keys(pricingGroupPrices)));

        const enrichedPricingGroups = pricingGroupsData.map((pg) => ({
          id: pg.id,
          name: pg.name,
          price: pricingGroupPrices[pg.id] || 0,
        }));

        updateData.pricingGroupPrices = enrichedPricingGroups;
      }

      // ✅ Handle subcategory updates with name fetching (same as before)
      if (subcategoryId !== undefined) {
        // Fetch the subcategory name for the new subcategoryId
        const [subcategory] = await db
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(eq(categories.id, subcategoryId));

        if (!subcategory) {
          return res.status(400).json({
            success: false,
            message: "Invalid subcategory",
          });
        }

        updateData.subcategoryId = subcategory.id;
        updateData.subcategoryName = subcategory.name;
        updateData.subcategory = { id: subcategory.id, name: subcategory.name };
      }

      const [updatedProduct] = await db
        .update(products)
        .set(updateData)
        .where(eq(products.id, id))
        .returning();

      if (!updatedProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      await invalidateProductsCache();

      return res.status(200).json({
        success: true,
        message: "Product updated successfully",
        product: updatedProduct,
      });
    } catch (error) {
      console.error("Update product error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
  static async getAllProducts(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const cacheKey = `products:page:${page}:limit:${limit}`;

      // Try Redis cache
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log("Returning products from cache");
        return res.status(200).json(JSON.parse(cached));
      }

      const offset = (Number(page) - 1) * Number(limit);

      const [result, countResult] = await Promise.all([
        db
          .select()
          .from(products)
          .orderBy(products.createdAt)
          .limit(Number(limit))
          .offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(products),
      ]);

      const [{ count }] = countResult;

      const response = {
        success: true,
        products: result,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalProducts: Number(count),
          totalPages: Math.ceil(Number(count) / Number(limit)),
        },
      };

      // Save to cache
      await redisClient.setEx(cacheKey, 300, JSON.stringify(response));

      console.log("Returning products from DB");
      return res.status(200).json(response);
    } catch (error) {
      console.error("Fetch products error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
  // ✅ Delete Product
  static async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [deleted] = await db
        .delete(products)
        .where(eq(products.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }

      await invalidateProductsCache();

      return res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Delete product error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // ✅ Fetch Pricing Groups (no caching, always latest)
  // ✅ Fetch Pricing Groups (cached with Redis)
  static async getPricingGroups(_req: Request, res: Response) {
    try {
      const cacheKey = "pricingGroups:all";

      // 1️⃣ Try cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log("Returning pricing groups from cache");
        return res.status(200).json({
          success: true,
          source: "cache",
          pricingGroups: JSON.parse(cached),
        });
      }

      // 2️⃣ Fetch from DB
      const groups = await db.select().from(pricingGroups);

      // 3️⃣ Save to cache
      await redisClient.setEx(cacheKey, 600, JSON.stringify(groups)); // cache for 10 min

      console.log("Returning pricing groups from DB");
      return res.status(200).json({
        success: true,
        source: "db",
        pricingGroups: groups,
      });
    } catch (error) {
      console.error("Fetch pricing groups error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getProductsByCategory(req: Request, res: Response) {
    try {
      const { categoryId } = req.params;

      if (!categoryId) {
        return res.status(400).json({
          success: false,
          message: "Category ID is required",
        });
      }

      const cacheKey = `products:category:${categoryId}`;

      // 🔹 Try Redis cache
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log("Returning products by category from cache");
        return res.status(200).json(JSON.parse(cached));
      }

      // 🔹 Query DB (subcategoryId is the FK in products)
      const result = await db
        .select()
        .from(products)
        .where(eq(products.subcategoryId, categoryId));

      if (!result || result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No products found for this category",
          products: [],
        });
      }

      const response = {
        success: true,
        message: "Products fetched successfully",
        products: result,
      };

      // 🔹 Cache for 5 minutes
      await redisClient.setEx(cacheKey, 300, JSON.stringify(response));

      console.log("Returning products by category from DB");
      return res.status(200).json(response);
    } catch (error) {
      console.error("Fetch products by category error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
  static async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const cacheKey = `product:${id}`;
      const cachedProduct = await redisClient.get(cacheKey);

      if (cachedProduct) {
        return res.status(200).json({
          success: true,
          source: "cache",
          data: JSON.parse(cachedProduct),
        });
      }

      // Query from DB
      const product = await db.query.products.findFirst({
        where: eq(products.id, id), // ✅ use string, not Number(id)
        with: {
          subcategory: {
            with: {
              category: true,
            },
          },
        },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Save in Redis
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(product));

      return res.status(200).json({
        success: true,
        source: "db",
        data: product,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error fetching product by ID" });
    }
  }
}

export default ProductController;
