import { Request, Response } from "express";
import { db } from "../db/dbConnection";
import { products } from "../db/schema/products.schema";
import { pricingGroups, transactions, users, wallets } from "../db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import redisClient from "../config/redis";
import { categories } from "../db/schema/categories.schema";
import axios from "axios";
import { EmailService } from "../services/email.service";
import { config } from "../db/schema/config.schema";
import { ZohoService } from "../services/zoho.service";
import { ZOHO_ENV } from "../config/Zoho";
import { ZohoItemService } from "../services/ZohoServices/zohoItems.service";
import { ZohoAccountIdsFetchingService } from "../services/ZohoServices/zohoAccountIdsFetching.service";
import { ZohoWalletService } from "../services/ZohoServices/zohoWallet.service";
import { ZohoProductPurchaseService } from "../services/ZohoServices/zohoProductsPurchase.service";

// Helper → Invalidate product caches
// const invalidateProductsCache = async () => {
//   try {
//     const keys = await redisClient.keys("products:page:*");
//     if (keys.length > 0) {
//       await redisClient.del(keys);
//     }
//   } catch (err) {
//     console.error("Error invalidating product cache:", err);
//   }
// };
const zohoItemService = new ZohoItemService();
type Subcategory = {
  id: string;
  name: string;
  zohoGroupId?: string;
};

const invalidateProductsCache = async () => {
  try {
    // Collect both paginated and category-based product keys
    const keys = await redisClient.keys("products:page:*");
    const categoryKeys = await redisClient.keys("products:category:*");

    const allKeys = [...keys, ...categoryKeys];

    if (allKeys.length > 0) {
      await redisClient.del(allKeys);
    }
  } catch (err) {
    console.error("Error invalidating product cache:", err);
  }
};

type ProductWithSubcategory = typeof products.$inferSelect & {
  subcategory?:
    | (typeof categories.$inferSelect & {
        category?: typeof categories.$inferSelect | null;
      })
    | null;
};

class ProductController {
  static async createProduct(req: Request, res: Response) {
    try {
      const body = req.body || {};
      let {
        name,
        description,
        pricingGroupPrices,
        subcategoryId,
        quantity,
        serviceId,
        isActive,
      } = body;

      // Parse JSON if it's string
      if (typeof pricingGroupPrices === "string") {
        pricingGroupPrices = JSON.parse(pricingGroupPrices);
      }

      // --- Fetch pricing groups with names ---
      const pricingGroupsData = await db
        .select({
          id: pricingGroups.id,
          name: pricingGroups.name,
          zohoPriceBookId: pricingGroups.zohoPriceBookId,
        })
        .from(pricingGroups)
        .where(inArray(pricingGroups.id, Object.keys(pricingGroupPrices)));

      const enrichedPricingGroups = pricingGroupsData.map((pg) => ({
        id: pg.id,
        name: pg.name,
        price: String(pricingGroupPrices[pg.id] || 0), // convert to string
        rate: Number(pricingGroupPrices[pg.id] || 0), // convert to number
        zohoPriceBookId: pg.zohoPriceBookId || "", // default to empty string
      }));

      // --- Fetch subcategory details ---
      const [subcategory] = await db
        .select({
          id: categories.id,
          name: categories.name,
          zohoGroupId: categories.zohoGroupId,
        })
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
      const rates = enrichedPricingGroups.map((pg) => Number(pg.rate));

      // Find min and max
      const minRate = Math.min(...rates);
      const maxRate = Math.max(...rates);

      // Optional: You can pick a "base rate" as min, max, or average
      const baseRate = `${minRate}-${maxRate}`; // minRate; // or maxRate or (minRate + maxRate) / 2
      // Calculate base rate (average or first pricing group)

      // Use transaction
      const result = await db.transaction(async (tx) => {
        // Create item in Zoho
        // await zohoService.createCustomFieldsInZoho();
        const rates = enrichedPricingGroups.map((pg) => Number(pg.rate));
        const minRate = Math.min(...rates);
        const maxRate = Math.max(...rates);
        const avgRate = (
          rates.reduce((sum, r) => sum + r, 0) / rates.length
        ).toFixed(2);

        const zohoItem = await zohoItemService.createItemInZoho({
          name,
          description: `${description}\n\nPrice Range: ${minRate} - ${maxRate}`,
          rate: avgRate, // ✅ Numeric average rate
          categoryName: subcategory.name,
          sku: serviceId,
          unit: "pcs",
          pricingGroupPrices: enrichedPricingGroups,
          isActive: isActive ?? true,
          imageUrl: image?.url,
        });
        const [newProduct] = await tx
          .insert(products)
          .values({
            name,
            quantity,
            description,
            pricingGroupPrices: enrichedPricingGroups.map((pg) => ({
              id: pg.id,
              name: pg.name,
              price: Number(pg.price), // convert back to number for DB
            })),

            subcategoryId: subcategory.id,
            subcategoryName: subcategory.name,
            serviceId,
            image,
            isActive: isActive ?? true,
            zohoItemId: zohoItem.item_id,
          })
          .returning();

        return { product: newProduct, zohoItem };
      });

      await invalidateProductsCache();

      return res.status(201).json({
        success: true,
        message: "Product created successfully",
        product: result.product,
      });
    } catch (error) {
      console.error("Create product error:", error);
      return res.status(500).json({
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
  // static async updateProduct(req: Request, res: Response) {
  //   try {
  //     const { id } = req.params;
  //     let {
  //       name,
  //       description,
  //       pricingGroupPrices,
  //       subcategoryId,
  //       quantity,
  //       serviceId,
  //       isActive,
  //     } = req.body;

  //     // Parse JSON if it's string (same as createProduct)
  //     if (typeof pricingGroupPrices === "string") {
  //       pricingGroupPrices = JSON.parse(pricingGroupPrices);
  //     }

  //     // Handle new file upload if provided
  //     const file = req.file as Express.MulterS3.File;
  //     const image = file
  //       ? {
  //           name: file.originalname,
  //           url: file.location,
  //           key: file.key,
  //           size: file.size,
  //           mimetype: file.mimetype,
  //         }
  //       : undefined;

  //     // Build update object (only include defined fields)
  //     const updateData: any = {};
  //     if (name !== undefined) updateData.name = name;
  //     if (description !== undefined) updateData.description = description;
  //     if (image !== undefined) updateData.image = image;
  //     if (quantity !== undefined) updateData.quantity = quantity; // ✅ NEW FIELD
  //     if (serviceId !== undefined) {
  //       updateData.serviceId = req.body.serviceId; // ✅
  //     }
  //     if (isActive !== undefined) updateData.isActive = isActive;

  //     if (pricingGroupPrices !== undefined) {
  //       // --- Fetch pricing groups with names (SAME AS CREATE) ---
  //       const pricingGroupsData = await db
  //         .select({ id: pricingGroups.id, name: pricingGroups.name })
  //         .from(pricingGroups)
  //         .where(inArray(pricingGroups.id, Object.keys(pricingGroupPrices)));

  //       const enrichedPricingGroups = pricingGroupsData.map((pg) => ({
  //         id: pg.id,
  //         name: pg.name,
  //         price: pricingGroupPrices[pg.id] || 0,
  //       }));

  //       updateData.pricingGroupPrices = enrichedPricingGroups;
  //     }

  //     // ✅ Handle subcategory updates with name fetching (same as before)
  //     if (subcategoryId !== undefined) {
  //       // Fetch the subcategory name for the new subcategoryId
  //       const [subcategory] = await db
  //         .select({ id: categories.id, name: categories.name })
  //         .from(categories)
  //         .where(eq(categories.id, subcategoryId));

  //       if (!subcategory) {
  //         return res.status(400).json({
  //           success: false,
  //           message: "Invalid subcategory",
  //         });
  //       }

  //       updateData.subcategoryId = subcategory.id;
  //       updateData.subcategoryName = subcategory.name;
  //       updateData.subcategory = { id: subcategory.id, name: subcategory.name };
  //     }

  //     const [updatedProduct] = await db
  //       .update(products)
  //       .set(updateData)
  //       .where(eq(products.id, id))
  //       .returning();

  //     if (!updatedProduct) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Product not found",
  //       });
  //     }

  //     await invalidateProductsCache();

  //     return res.status(200).json({
  //       success: true,
  //       message: "Product updated successfully",
  //       product: updatedProduct,
  //     });
  //   } catch (error) {
  //     console.error("Update product error:", error);
  //     return res.status(500).json({
  //       success: false,
  //       message: "Internal server error",
  //     });
  //   }
  // }
  static async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      let {
        name,
        description,
        pricingGroupPrices,
        subcategoryId,
        quantity,
        serviceId,
        isActive,
      } = req.body;

      // Parse JSON if it's string
      if (typeof pricingGroupPrices === "string") {
        pricingGroupPrices = JSON.parse(pricingGroupPrices);
      }

      const [existingProduct] = await db
        .select({ zohoItemId: products.zohoItemId })
        .from(products)
        .where(eq(products.id, id))
        .limit(1);

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
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
      if (quantity !== undefined) updateData.quantity = quantity;
      if (serviceId !== undefined) updateData.serviceId = serviceId;
      if (isActive !== undefined) updateData.isActive = isActive;

      let enrichedPricingGroups:
        | {
            id: string;
            name: string;
            price: string;
            rate: number;
            zohoPriceBookId?: string;
          }[]
        | undefined;

      let subcategory: Subcategory | null = null;

      // ✅ Fetch pricing groups with zohoPriceBookId (same as create)
      if (pricingGroupPrices !== undefined) {
        const pricingGroupsData = await db
          .select({
            id: pricingGroups.id,
            name: pricingGroups.name,
            zohoPriceBookId: pricingGroups.zohoPriceBookId,
          })
          .from(pricingGroups)
          .where(inArray(pricingGroups.id, Object.keys(pricingGroupPrices)));

        enrichedPricingGroups = pricingGroupsData.map((pg) => ({
          id: pg.id,
          name: pg.name,
          price: String(pricingGroupPrices[pg.id] || 0),
          rate: Number(pricingGroupPrices[pg.id] || 0),
          zohoPriceBookId: pg.zohoPriceBookId || "",
        }));

        updateData.pricingGroupPrices = enrichedPricingGroups.map((pg) => ({
          id: pg.id,
          name: pg.name,
          price: pg.rate, // Store as number in DB
        }));
      }

      // Handle subcategory updates with name fetching
      if (subcategoryId !== undefined) {
        let [subcatRow] = await db
          .select({
            id: categories.id,
            name: categories.name,
            zohoGroupId: categories.zohoGroupId,
          })
          .from(categories)
          .where(eq(categories.id, subcategoryId));

        if (!subcatRow) {
          return res.status(400).json({
            success: false,
            message: "Invalid subcategory",
          });
        }

        subcategory = {
          id: subcatRow.id,
          name: subcatRow.name,
          zohoGroupId: subcatRow.zohoGroupId || "",
        };

        updateData.subcategoryId = subcatRow.id;
        updateData.subcategoryName = subcatRow.name;
        updateData.subcategory = { id: subcatRow.id, name: subcatRow.name };
      }

      // Use transaction
      const result = await db.transaction(async (tx) => {
        // ✅ Update in Zoho - ONLY if we have data to update
        if (existingProduct.zohoItemId) {
          const zohoUpdatePayload: any = {};

          // Only add fields that were actually provided
          if (name !== undefined) zohoUpdatePayload.name = name;
          if (description !== undefined) {
            // ✅ Build description with price range if pricing groups are updated
            if (enrichedPricingGroups && enrichedPricingGroups.length > 0) {
              const rates = enrichedPricingGroups.map((pg) => pg.rate);
              const minRate = Math.min(...rates);
              const maxRate = Math.max(...rates);
              zohoUpdatePayload.description = `${description}\n\nPrice Range: ${minRate} - ${maxRate}`;
            } else {
              zohoUpdatePayload.description = description;
            }
          }

          // ✅ Calculate and add rate if pricing groups are updated
          if (enrichedPricingGroups && enrichedPricingGroups.length > 0) {
            const rates = enrichedPricingGroups.map((pg) => pg.rate);
            const avgRate = (
              rates.reduce((sum, r) => sum + r, 0) / rates.length
            ).toFixed(2);
            zohoUpdatePayload.rate = avgRate; // ✅ Send as string
            zohoUpdatePayload.pricingGroupPrices = enrichedPricingGroups;
          }

          if (subcategory?.zohoGroupId) {
            zohoUpdatePayload.groupId = subcategory.zohoGroupId;
          }

          if (isActive !== undefined) {
            zohoUpdatePayload.isActive = isActive;
          }

          if (image?.url) {
            zohoUpdatePayload.imageUrl = image.url;
          }

          // Add unit only if other fields are being updated
          if (Object.keys(zohoUpdatePayload).length > 0) {
            zohoUpdatePayload.unit = "pcs";
          }

          console.log("📤 Zoho update payload:", zohoUpdatePayload);

          // ✅ Only call Zoho API if we have something to update
          if (Object.keys(zohoUpdatePayload).length > 0) {
            await zohoItemService.updateItemInZoho(
              existingProduct.zohoItemId,
              zohoUpdatePayload
            );
          }
        }

        // Update in database
        const [updatedProduct] = await tx
          .update(products)
          .set(updateData)
          .where(eq(products.id, id))
          .returning();

        if (!updatedProduct) {
          throw new Error("Product not found");
        }

        await invalidateProductsCache();

        return updatedProduct;
      });

      return res.status(200).json({
        success: true,
        message: "Product updated successfully",
        product: result,
      });
    } catch (error) {
      console.error("Update product error:", error);
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
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

      return res.status(200).json(response);
    } catch (error) {
      console.error("Fetch products error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [existingProduct] = await db
        .select({
          zohoItemId: products.zohoItemId,
          name: products.name,
        })
        .from(products)
        .where(eq(products.id, id))
        .limit(1);

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      await db.transaction(async (tx) => {
        // ✅ Mark as inactive in Zoho instead of deleting
        if (existingProduct.zohoItemId) {
          await zohoItemService.markItemAsInactive(existingProduct.zohoItemId);
        }

        // Delete from local database
        const [deleted] = await tx
          .delete(products)
          .where(eq(products.id, id))
          .returning();

        if (!deleted) {
          throw new Error("Product not found");
        }
      });

      await invalidateProductsCache();

      return res.status(200).json({
        success: true,
        message: "Product deleted successfully (marked as inactive in Zoho)",
      });
    } catch (error) {
      console.error("Delete product error:", error);
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  static async getPricingGroups(_req: Request, res: Response) {
    try {
      const cacheKey = "pricingGroups:all";

      // 1️⃣ Try cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
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
        return res.status(200).json(JSON.parse(cached));
      }

      // 🔹 Query DB (subcategoryId is the FK in products)
      const result = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.subcategoryId, categoryId),
            eq(products.isActive, true)
          )
        );

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

      // Fetch the base product
      const product = await db.query.products.findFirst({
        where: eq(products.id, id),
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Create the enhanced product object with proper typing
      let enrichedProduct: ProductWithSubcategory = { ...product };

      // Manually fetch subcategory and parent category if needed
      if (product.subcategoryId) {
        const subcategory = await db.query.categories.findFirst({
          where: eq(categories.id, product.subcategoryId),
        });

        if (subcategory) {
          let parentCategory: typeof categories.$inferSelect | null = null;

          if (subcategory.parentCategoryId) {
            parentCategory =
              (await db.query.categories.findFirst({
                where: eq(categories.id, subcategory.parentCategoryId),
              })) ?? null; // ✅ fallback ensures it's never undefined
          }

          // Now TypeScript knows about the subcategory property
          enrichedProduct.subcategory = {
            ...subcategory,
            category: parentCategory,
          };
        }
      }

      await redisClient.setEx(cacheKey, 3600, JSON.stringify(enrichedProduct));

      return res.status(200).json({
        success: true,
        source: "db",
        data: enrichedProduct,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error fetching product by ID" });
    }
  }

  static async getProductServices(req: Request, res: Response) {
    try {
      const apiUrl = process.env.EXTERNAL_PRODUCT_API;
      if (!apiUrl) {
        return res.status(500).json({
          success: false,
          message: "External API URL not configured",
        });
      }

      const cacheKey = "external:productServices";

      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.status(200).json(JSON.parse(cached));
      }

      const formData = new URLSearchParams();
      formData.append("request", "servicelist");

      const { data } = await axios.post(apiUrl, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!data || !data.status) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch services",
          raw: data,
        });
      }

      const response = {
        success: true,
        count: data.ServiceCount,
        services: data.ServiceList,
      };

      await redisClient.setEx(cacheKey, 600, JSON.stringify(response));

      return res.status(200).json(response);
    } catch (error: any) {
      console.error("getProductServices error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Error fetching external product services",
      });
    }
  }
  // Add this method to your ProductController class
  // static async purchaseProduct(req: Request, res: Response) {
  //   try {
  //     const { productId } = req.params;
  //     const userId = req.user!.id;
  //     const { playerId } = req.body;

  //     if (!playerId) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Player ID is required",
  //       });
  //     }

  //     // 1. Get product details
  //     const product = await db.query.products.findFirst({
  //       where: eq(products.id, productId),
  //     });

  //     if (!product) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Product not found",
  //       });
  //     }

  //     // 2. Get user and wallet details
  //     const [user] = await db
  //       .select({
  //         id: users.id,
  //         name: users.name,
  //         email: users.email,
  //         pricingGroupId: users.pricingGroupId,
  //         zohoContactId: users.zohoContactId,
  //       })
  //       .from(users)
  //       .where(eq(users.id, userId));

  //     if (!user) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "User not found",
  //       });
  //     }

  //     const [wallet] = await db
  //       .select()
  //       .from(wallets)
  //       .where(eq(wallets.userId, userId));

  //     if (!wallet) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Wallet not found",
  //       });
  //     }

  //     const pricingGroupPrice = product.pricingGroupPrices?.find(
  //       (pg: any) => pg.id === user.pricingGroupId
  //     );

  //     if (!pricingGroupPrice) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Price not configured for user's pricing group",
  //       });
  //     }

  //     // const [appConfig] = await db.select().from(config).limit(1);

  //     // const minimumBalanceRequirement = parseFloat(
  //     //   appConfig?.minimumBalanceRequirement?.toString() || "0"
  //     // );

  //     // const productPrice = parseFloat(pricingGroupPrice.price);
  //     const productPrice = parseFloat(pricingGroupPrice.price.toString());
  //     const currentBalance = parseFloat(wallet.balance);

  //     // 4. Check if user has sufficient balance
  //     // if (currentBalance < minimumBalanceRequirement) {
  //     //   return res.status(400).json({
  //     //     success: false,
  //     //     message: `You must have at least ${minimumBalanceRequirement} in your wallet to make purchases`,
  //     //     required: minimumBalanceRequirement,
  //     //     current: currentBalance,
  //     //   });
  //     // }

  //     if (currentBalance < productPrice) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Insufficient balance",
  //         required: productPrice,
  //         current: currentBalance,
  //       });
  //     }

  //     // 5. Call external service
  //     const apiUrl = process.env.EXTERNAL_PRODUCT_API;
  //     if (!apiUrl) {
  //       return res.status(500).json({
  //         success: false,
  //         message: "External API URL not configured",
  //       });
  //     }

  //     // Generate a unique reference number (below 40 as required)
  //     const referenceNumber = Math.floor(Math.random() * 40);

  //     const formData = new URLSearchParams();
  //     formData.append("request", "neworder");
  //     formData.append("service", product.serviceId.toString());
  //     formData.append("reference", referenceNumber.toString());
  //     formData.append("player_id", playerId);

  //     // const { data } = await axios.post(apiUrl, formData, {
  //     //   headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //     //   timeout: 30000,
  //     // });

  //     // if (!data || !data.status) {
  //     //   return res.status(500).json({
  //     //     success: false,
  //     //     message: "External service failed",
  //     //     externalResponse: data,
  //     //   });
  //     // }

  //     // 6. Deduct amount from wallet
  //     const newBalance = currentBalance - productPrice;

  //     await db
  //       .update(wallets)
  //       .set({
  //         balance: newBalance.toString(),
  //         updatedAt: new Date(),
  //       })
  //       .where(eq(wallets.userId, userId));
  //     // 7. Zoho Sync: Debit wallet (decrease unused credits + liability + income + bank)
  //     const zohoService = new ZohoService();
  //     const walletLiabilityId = await zohoService.getWalletAccountId(); // Liability
  //     const walletIncomeId = await zohoService.getWalletIncomeAccountId(); // Income (revenue)
  //     const bankAccountId = await zohoService.getBankAccountId(); // Bank (credit)
  //     const walletClearingId = await zohoService.getWalletClearingAccountId(); // Clearing
  //     const incomeAccountId = await zohoService.getWalletIncomesAccountId();

  //     const expenseAccountId = await zohoService.getWalletExpenseAccountId();
  //     // Step 7a: Main debit (liability + income + decrease unused credits)
  //     await zohoService.adjustWalletAndSyncZoho({
  //       customer_id: user.zohoContactId,
  //       amount: productPrice,
  //       type: "debit",
  //       reason: `Product purchase: ${product.name} for player ${playerId}`,
  //       reference: `PURCH-${Date.now()}`,
  //       liability_account_id: walletLiabilityId,
  //       walletIncomeAccountID: walletIncomeId,
  //       walletClearingAccountId: walletClearingId,
  //       expenseAccountId: expenseAccountId,
  //       incomeAccountId: incomeAccountId,
  //     });

  //     // Step 7b: Additional journal for bank credit (real money to bank)
  //     const today = new Date().toISOString().split("T")[0];
  //     const bankJournalPayload = {
  //       journal_date: today,
  //       reference_number: `BANK-CREDIT-${Date.now()}`,
  //       notes: `Bank credit from wallet spend | Product: ${product.name}`,
  //       line_items: [
  //         {
  //           account_id: bankAccountId, // Bank account
  //           debit_or_credit: "credit", // Increase bank (money received)
  //           amount: productPrice,
  //           customer_id: user.zohoContactId,
  //           description: "Wallet spend converted to bank credit",
  //         },
  //         {
  //           account_id: walletClearingId, // Offset with clearing
  //           debit_or_credit: "debit",
  //           amount: productPrice,
  //           customer_id: user.zohoContactId,
  //           description: "Offset wallet spend to bank",
  //         },
  //       ],
  //     };

  //     await axios.post(
  //       `${ZOHO_ENV.BOOKS_API}/journals?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
  //       bankJournalPayload,
  //       {
  //         headers: {
  //           Authorization: `Zoho-oauthtoken ${await zohoService.getValidAccessToken()}`,
  //         },
  //       }
  //     );

  //     // 7. Create purchase transaction
  //     await db.insert(transactions).values({
  //       walletId: wallet.id,
  //       userId,
  //       type: "purchase",
  //       amount: `-${productPrice}`, // Negative amount for purchase
  //       currency: wallet.currency,
  //       status: "completed",
  //       referenceId: `hardcode`,
  //       metadata: JSON.stringify({
  //         productId: product.id,
  //         productName: product.name,
  //         serviceId: product.serviceId,
  //         playerId: playerId,
  //         referenceNumber: referenceNumber,
  //         pricingGroupId: user.pricingGroupId,
  //         originalBalance: wallet.balance,
  //         newBalance: newBalance.toString(),
  //         externalResponse: {},
  //       }),
  //     });

  //     // 8. Invalidate caches
  //     await Promise.all([
  //       invalidateProductsCache(),
  //       // Invalidate user transactions cache
  //       (async () => {
  //         const pattern = `transactions:${userId}:*`;
  //         const keys = await redisClient.keys(pattern);
  //         if (keys.length > 0) {
  //           await redisClient.del(keys);
  //         }
  //       })(),
  //       (async () => {
  //         const pattern = `wallet:balance:${userId}`;
  //         await redisClient.del(pattern);
  //       })(),
  //     ]);

  //     // await EmailService.sendTemplateEmail("productPurchase", user.email, {
  //     //   name: user.name,
  //     //   productName: product.name,
  //     //   amount: productPrice.toString(),
  //     //   newBalance: newBalance.toString(),
  //     //   referenceId: data.orderid,
  //     //   playerId: playerId,
  //     //   date: new Date().toLocaleString(),
  //     // });

  //     return res.status(200).json({
  //       success: true,
  //       message: "Product purchased successfully",
  //       product: product.name,
  //       amount: productPrice,
  //       newBalance: newBalance,
  //     });
  //   } catch (error: any) {
  //     console.error("Purchase product error:", error.message);

  //     if (error.code === "ECONNABORTED") {
  //       return res.status(504).json({
  //         success: false,
  //         message: "External service timeout",
  //       });
  //     }

  //     if (error.response) {
  //       // External API error
  //       return res.status(502).json({
  //         success: false,
  //         message: "External service error",
  //         externalError: error.response.data,
  //       });
  //     }

  //     return res.status(500).json({
  //       success: false,
  //       message: "Internal server error",
  //     });
  //   }
  // }
  // ==========================================
  // PRODUCT PURCHASE WITH PROPER ZOHO SYNC
  // ==========================================

  static async purchaseProduct(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const userId = req.user!.id;
      const { playerId } = req.body;

      if (!playerId) {
        return res.status(400).json({
          success: false,
          message: "Player ID is required",
        });
      }

      // 1. Get product details
      const product = await db.query.products.findFirst({
        where: eq(products.id, productId),
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // 2. Get user and wallet details
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          pricingGroupId: users.pricingGroupId,
          zohoContactId: users.zohoContactId,
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const [wallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.userId, userId));

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }

      // 3. Get price from user's pricing group
      const pricingGroupPrice = product.pricingGroupPrices?.find(
        (pg: any) => pg.id === user.pricingGroupId
      );

      if (!pricingGroupPrice) {
        return res.status(400).json({
          success: false,
          message: "Price not configured for user's pricing group",
        });
      }

      const productPrice = parseFloat(pricingGroupPrice.price.toString());
      const currentBalance = parseFloat(wallet.balance);

      // 4. Check if user has sufficient balance
      if (currentBalance < productPrice) {
        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
          required: productPrice,
          current: currentBalance,
        });
      }

      // 5. Call external service (your existing code)
      const apiUrl = process.env.EXTERNAL_PRODUCT_API;
      if (!apiUrl) {
        return res.status(500).json({
          success: false,
          message: "External API URL not configured",
        });
      }

      const referenceNumber = Math.floor(Math.random() * 40);
      // ... external API call code ...

      // 6. Deduct amount from wallet
      const newBalance = currentBalance - productPrice;

      await db
        .update(wallets)
        .set({
          balance: newBalance.toString(),
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, userId));

      console.log("✅ Zoho wallet balance updated", user.zohoContactId);
      const zohoProductPurchaseService = new ZohoProductPurchaseService();

      const zohoResult = await zohoProductPurchaseService.processPurchase({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        zohoContactId: user.zohoContactId,
        pricingGroupId: user.pricingGroupId || "",
        productId: product.id,
        productName: product.name,
        productZohoItemId: product.zohoItemId || "",
        playerId: playerId,
        purchaseAmount: productPrice,
        priceListName: pricingGroupPrice.name,
        finalPrice: productPrice,
        quantity: product.quantity || "",
      });

      console.log(
        `✅ Zoho processing complete: Invoice ${zohoResult.invoiceNumber}`
      );
      // 11. Create purchase transaction in your DB
      await db.insert(transactions).values({
        walletId: wallet.id,
        userId,
        type: "purchase",
        amount: `-${productPrice}`,
        currency: wallet.currency,
        status: "completed",
        referenceId: zohoResult.invoiceNumber,
        metadata: JSON.stringify({
          productId: product.id,
          productName: product.name,
          serviceId: product.serviceId,
          playerId: playerId,
          referenceNumber: referenceNumber,
          pricingGroupId: user.pricingGroupId,
          priceListName: zohoResult.priceListName,
          priceListPrice: zohoResult.finalPrice,
          originalBalance: wallet.balance,
          newBalance: newBalance.toString(),
          zohoInvoiceId: zohoResult.invoiceId,
          zohoInvoiceNumber: zohoResult.invoiceNumber,
          creditNotesApplied: zohoResult.creditNotesApplied,
        }),
      });

      // 12. Invalidate caches
      await Promise.all([
        invalidateProductsCache(),
        (async () => {
          const pattern = `transactions:${userId}:*`;
          const keys = await redisClient.keys(pattern);
          if (keys.length > 0) {
            await redisClient.del(keys);
          }
        })(),
        (async () => {
          const pattern = `wallet:balance:${userId}`;
          await redisClient.del(pattern);
        })(),
      ]);

      return res.status(200).json({
        success: true,
        message: "Product purchased successfully",
        product: product.name,
        amount: productPrice,
        newBalance: newBalance,
        priceList: zohoResult.priceListName,
        zohoInvoice: zohoResult.invoiceNumber,
      });
    } catch (error: any) {
      console.error("Purchase product error:", error.message);

      if (error.code === "ECONNABORTED") {
        return res.status(504).json({
          success: false,
          message: "External service timeout",
        });
      }

      if (error.response) {
        return res.status(502).json({
          success: false,
          message: "External service error",
          externalError: error.response.data,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ==========================================
  // HELPER: Update Zoho Wallet Balance
  // ==========================================
  async updateZohoWalletBalance(
    customerId: string,
    amount: number,
    isIncrease: boolean
  ) {
    const zohoService = new ZohoService();
    const accessToken = await zohoService.getValidAccessToken();

    // Get current wallet balance from custom field
    const { data: customerData } = await axios.get(
      `${ZOHO_ENV.BOOKS_API}/contacts/${customerId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    const currentWalletBalance = parseFloat(
      customerData.contact.custom_fields?.find(
        (cf: any) => cf.label === "Wallet Balance"
      )?.value || "0"
    );

    const newWalletBalance = isIncrease
      ? currentWalletBalance + amount
      : currentWalletBalance - amount;

    // Update customer with new wallet balance
    await axios.put(
      `${ZOHO_ENV.BOOKS_API}/contacts/${customerId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        custom_fields: [
          {
            label: "Wallet Balance",
            value: newWalletBalance.toFixed(2),
          },
        ],
      },
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    console.log(
      `✅ Updated Zoho wallet balance: ${currentWalletBalance} → ${newWalletBalance}`
    );
  }
}

export default ProductController;
