import { Request, Response } from "express";
import { db } from "../db/dbConnection";
import { pricingGroups, users } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import redisClient from "../config/redis";
import { ZohoService } from "../services/zoho.service";
import { ZohoPriceBookService } from "../services/ZohoServices/zohoPriceBook.service";

const invalidatePricingGroupsCache = async () => {
  try {
    // Find all cache keys for pricingGroups
    const keys = await redisClient.keys("pricingGroups:page:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.error("Error invalidating cache:", err);
  }
};

class PricingGroupController {
  // static async createPricingGroup(req: Request, res: Response) {
  //   try {
  //     const { name, isDefault = false } = req.body;

  //     // If new group isDefault, unset all others first
  //     if (isDefault) {
  //       await db
  //         .update(pricingGroups)
  //         .set({ isDefault: false })
  //         .where(sql`1=1`);
  //     }

  //     const [newGroup] = await db
  //       .insert(pricingGroups)
  //       .values({ name, isDefault })
  //       .returning({
  //         id: pricingGroups.id,
  //         name: pricingGroups.name,
  //         isDefault: pricingGroups.isDefault,
  //         createdAt: pricingGroups.createdAt,
  //       });

  //     await invalidatePricingGroupsCache();

  //     return res.status(201).json({
  //       success: true,
  //       message: "Pricing group created successfully",
  //       pricingGroup: newGroup,
  //     });
  //   } catch (error) {
  //     console.error("Create pricing group error:", error);
  //     return res.status(500).json({ message: "Internal server error" });
  //   }
  // }
  static async createPricingGroup(req: Request, res: Response) {
    try {
      const { name, isDefault } = req.body;

      // Check if name already exists
      const [existing] = await db
        .select({ id: pricingGroups.id })
        .from(pricingGroups)
        .where(eq(pricingGroups.name, name))
        .limit(1);

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Pricing group with this name already exists",
        });
      }

      const zohoPriceBookService = new ZohoPriceBookService();

      // ✅ Step 1: Create Zoho price book first
      let zohoPriceBook;
      try {
        zohoPriceBook = await zohoPriceBookService.createPriceBookInZoho(name);
      } catch (zohoError: any) {
        console.error("Zoho price book creation failed:", zohoError);
        return res.status(500).json({
          success: false,
          message: "Failed to create price book in Zoho",
        });
      }

      // ✅ Step 2: DB transaction
      const result = await db.transaction(async (tx) => {
        // If this is set as default, remove default from others
        if (isDefault) {
          await tx
            .update(pricingGroups)
            .set({ isDefault: false })
            .where(eq(pricingGroups.isDefault, true));
        }

        // Create pricing group in DB
        const [newGroup] = await tx
          .insert(pricingGroups)
          .values({
            name,
            isDefault: isDefault ?? false,
            zohoPriceBookId: zohoPriceBook.pricebook_id,
          })
          .returning();

        if (!newGroup) throw new Error("Failed to insert pricing group in DB");

        return { group: newGroup, zohoPriceBook };
      });

      return res.status(201).json({
        success: true,
        message: "Pricing group created successfully",
        pricingGroup: result.group,
      });
    } catch (error: any) {
      console.error("Create pricing group error:", error);
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  static async updatePricingGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, isDefault, isActive } = req.body;

      const [existingGroup] = await db
        .select({ zohoPriceBookId: pricingGroups.zohoPriceBookId })
        .from(pricingGroups)
        .where(eq(pricingGroups.id, id))
        .limit(1);

      if (!existingGroup) {
        return res.status(404).json({
          success: false,
          message: "Pricing group not found",
        });
      }

      const zohoPriceBookService = new ZohoPriceBookService();

      // ✅ Step 1: Update Zoho first if needed
      if ((name || description) && existingGroup.zohoPriceBookId) {
        try {
          await zohoPriceBookService.updatePriceBookInZoho(
            existingGroup.zohoPriceBookId,
            { name, description }
          );
        } catch (zohoError: any) {
          console.error("Zoho update failed:", zohoError);
          return res.status(500).json({
            success: false,
            message: "Failed to update Zoho price book",
          });
        }
      }

      // ✅ Step 2: DB transaction
      const updatedGroup = await db.transaction(async (tx) => {
        // If setting as default, remove default from others
        if (isDefault === true) {
          await tx
            .update(pricingGroups)
            .set({ isDefault: false })
            .where(eq(pricingGroups.isDefault, true));
        }

        // Update pricing group in DB
        const [updated] = await tx
          .update(pricingGroups)
          .set({
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(isDefault !== undefined && { isDefault }),
            ...(isActive !== undefined && { isActive }),
            zohoLastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(pricingGroups.id, id))
          .returning();

        if (!updated) throw new Error("Failed to update pricing group in DB");

        return updated;
      });

      return res.status(200).json({
        success: true,
        message: "Pricing group updated successfully",
        pricingGroup: updatedGroup,
      });
    } catch (error: any) {
      console.error("Update pricing group error:", error);
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  static async getAllPricingGroups(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20 } = req.query;
      // const cacheKey = `pricingGroups:page:${page}:limit:${limit}`;

      // const cached = await redisClient.get(cacheKey);
      // if (cached) {
      //   return res.status(200).json(JSON.parse(cached));
      // }

      const offset = (Number(page) - 1) * Number(limit);

      const [result, countResult] = await Promise.all([
        db
          .select({
            id: pricingGroups.id,
            name: pricingGroups.name,
            isDefault: pricingGroups.isDefault,
            createdAt: pricingGroups.createdAt,
            totalUsers: sql<number>`COUNT(${users.id})`,
          })
          .from(pricingGroups)
          .leftJoin(users, eq(users.pricingGroupId, pricingGroups.id))
          .groupBy(pricingGroups.id)
          .orderBy(pricingGroups.createdAt)
          .limit(Number(limit))
          .offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(pricingGroups),
      ]);

      const [{ count }] = countResult;

      const response = {
        success: true,
        // pricingGroups: result,
        pricingGroups: result.map((pg) => ({
          ...pg,
          users: Number(pg.totalUsers),
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalPricingGroups: Number(count),
          totalPages: Math.ceil(Number(count) / Number(limit)),
        },
      };

      // await redisClient.setEx(cacheKey, 300, JSON.stringify(response));

      return res.status(200).json(response);
    } catch (error) {
      console.error("Get pricing groups error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getPricingGroupById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [group] = await db
        .select({
          id: pricingGroups.id,
          name: pricingGroups.name,
          isDefault: pricingGroups.isDefault,
          createdAt: pricingGroups.createdAt,
        })
        .from(pricingGroups)
        .where(eq(pricingGroups.id, id))
        .limit(1);

      if (!group)
        return res.status(404).json({ message: "Pricing group not found" });

      return res.status(200).json({ success: true, pricingGroup: group });
    } catch (error) {
      console.error("Get pricing group error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async deletePricingGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Get pricing group details
      const [pricingGroup] = await db
        .select({
          id: pricingGroups.id,
          name: pricingGroups.name,
          zohoPriceBookId: pricingGroups.zohoPriceBookId,
        })
        .from(pricingGroups)
        .where(eq(pricingGroups.id, id))
        .limit(1);

      if (!pricingGroup) {
        return res.status(404).json({
          success: false,
          message: "Pricing group not found",
        });
      }

      // ✅ Delete from Zoho first (includes custom field cleanup)
      let zohoResult = null;
      if (pricingGroup.zohoPriceBookId) {
        const zohoItemService = new ZohoPriceBookService();

        try {
          zohoResult = await zohoItemService.deletePriceBookInZoho(
            pricingGroup.zohoPriceBookId
          );
          console.log(`✅ Deleted price book from Zoho:`, zohoResult);
        } catch (error: any) {
          console.error("❌ Failed to delete from Zoho:", error.message);
          return res.status(500).json({
            success: false,
            message: `Failed to delete price book from Zoho: ${error.message}`,
          });
        }
      }

      // ✅ Delete from local database
      await db.delete(pricingGroups).where(eq(pricingGroups.id, id));

      // Clear cache if you're using Redis
      // await redisClient.del("pricing-groups:*");

      return res.status(200).json({
        success: true,
        message: `Pricing group "${pricingGroup.name}" deleted successfully`,
        zoho: zohoResult,
      });
    } catch (error) {
      console.error("Delete pricing group error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

export default PricingGroupController;
