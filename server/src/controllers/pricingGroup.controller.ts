import { Request, Response } from "express";
import { db } from "../db/dbConnection";
import { pricingGroups } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import redisClient from "../config/redis";

const invalidatePricingGroupsCache = async () => {
  try {
    // Find all cache keys for pricingGroups
    const keys = await redisClient.keys("pricingGroups:page:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log("Cache invalidated for pricingGroups:", keys);
    }
  } catch (err) {
    console.error("Error invalidating cache:", err);
  }
};

class PricingGroupController {
  // static async createPricingGroup(req: Request, res: Response) {
  //   try {
  //     const { name, isDefault = false } = req.body;

  //     console.log("entered", name);

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

  // static async updatePricingGroup(req: Request, res: Response) {
  //   try {
  //     const { id } = req.params;
  //     const { name, isDefault } = req.body;

  //     const [updatedGroup] = await db
  //       .update(pricingGroups)
  //       .set({
  //         ...(name && { name }),
  //         ...(isDefault !== undefined && { isDefault }),
  //       })
  //       .where(eq(pricingGroups.id, id))
  //       .returning({
  //         id: pricingGroups.id,
  //         name: pricingGroups.name,
  //         isDefault: pricingGroups.isDefault,
  //         createdAt: pricingGroups.createdAt,
  //       });

  //     if (!updatedGroup) {
  //       return res.status(404).json({ message: "Pricing group not found" });
  //     }

  //     await invalidatePricingGroupsCache();

  //     return res.status(200).json({
  //       success: true,
  //       message: "Pricing group updated successfully",
  //       pricingGroup: updatedGroup,
  //     });
  //   } catch (error) {
  //     console.error("Update pricing group error:", error);
  //     return res.status(500).json({ message: "Internal server error" });
  //   }
  // }

  static async createPricingGroup(req: Request, res: Response) {
    try {
      const { name, isDefault = false } = req.body;

      // If new group isDefault, unset all others first
      if (isDefault) {
        await db
          .update(pricingGroups)
          .set({ isDefault: false })
          .where(sql`1=1`);
      }

      const [newGroup] = await db
        .insert(pricingGroups)
        .values({ name, isDefault })
        .returning({
          id: pricingGroups.id,
          name: pricingGroups.name,
          isDefault: pricingGroups.isDefault,
          createdAt: pricingGroups.createdAt,
        });

      await invalidatePricingGroupsCache();

      return res.status(201).json({
        success: true,
        message: "Pricing group created successfully",
        pricingGroup: newGroup,
      });
    } catch (error) {
      console.error("Create pricing group error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async updatePricingGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, isDefault } = req.body;

      // If updating group to be default, unset others
      if (isDefault === true) {
        await db
          .update(pricingGroups)
          .set({ isDefault: false })
          .where(sql`${pricingGroups.id} <> ${id}`);
      }

      const [updatedGroup] = await db
        .update(pricingGroups)
        .set({
          ...(name && { name }),
          ...(isDefault !== undefined && { isDefault }),
        })
        .where(eq(pricingGroups.id, id))
        .returning({
          id: pricingGroups.id,
          name: pricingGroups.name,
          isDefault: pricingGroups.isDefault,
          createdAt: pricingGroups.createdAt,
        });

      if (!updatedGroup) {
        return res.status(404).json({ message: "Pricing group not found" });
      }

      await invalidatePricingGroupsCache();

      return res.status(200).json({
        success: true,
        message: "Pricing group updated successfully",
        pricingGroup: updatedGroup,
      });
    } catch (error) {
      console.error("Update pricing group error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getAllPricingGroups(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const cacheKey = `pricingGroups:page:${page}:limit:${limit}`;

      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log("cached return");
        return res.status(200).json(JSON.parse(cached));
      }

      const offset = (Number(page) - 1) * Number(limit);

      const [result, countResult] = await Promise.all([
        db
          .select({
            id: pricingGroups.id,
            name: pricingGroups.name,
            isDefault: pricingGroups.isDefault,
            createdAt: pricingGroups.createdAt,
          })
          .from(pricingGroups)
          .orderBy(pricingGroups.createdAt)
          .limit(Number(limit))
          .offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(pricingGroups),
      ]);

      const [{ count }] = countResult;

      console.log("db return");

      const response = {
        success: true,
        pricingGroups: result,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalPricingGroups: Number(count),
          totalPages: Math.ceil(Number(count) / Number(limit)),
        },
      };

      await redisClient.setEx(cacheKey, 300, JSON.stringify(response));

      console.log("db return");
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

      const [deletedGroup] = await db
        .delete(pricingGroups)
        .where(eq(pricingGroups.id, id))
        .returning({ id: pricingGroups.id });

      if (!deletedGroup) {
        return res.status(404).json({ message: "Pricing group not found" });
      }

      await invalidatePricingGroupsCache();

      return res.status(200).json({
        success: true,
        message: "Pricing group deleted successfully",
      });
    } catch (error) {
      console.error("Delete pricing group error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default PricingGroupController;
