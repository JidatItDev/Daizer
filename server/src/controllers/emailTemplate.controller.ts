import { Request, Response } from "express";
import { db } from "../db/dbConnection";
import { emailTemplates } from "../db/schema";
import { eq, sql, or } from "drizzle-orm";
import redisClient from "../config/redis";

const invalidateEmailTemplatesCache = async () => {
  try {
    const keys = await redisClient.keys("emailTemplates:page:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.error("Error invalidating cache:", err);
  }
};

class EmailTemplateController {
  // Create or Update Template
  static async createOrEditTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, type, subject, body } = req.body;

      let template;

      if (id) {
        [template] = await db
          .update(emailTemplates)
          .set({ name, type, subject, body })
          .where(eq(emailTemplates.id, id))
          .returning();
      } else {
        [template] = await db
          .insert(emailTemplates)
          .values({ name, type, subject, body })
          .returning();
      }

      await invalidateEmailTemplatesCache();

      return res.status(200).json({
        success: true,
        message: id
          ? "Email template updated successfully"
          : "Email template created successfully",
        template,
      });
    } catch (error) {
      console.error("Create/Edit email template error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // Get All Templates (with cache + pagination)
  static async getAllEmailTemplates(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const cacheKey = `emailTemplates:page:${page}:limit:${limit}`;

      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.status(200).json(JSON.parse(cached));
      }

      const offset = (Number(page) - 1) * Number(limit);

      const [result, countResult] = await Promise.all([
        db
          .select()
          .from(emailTemplates)
          .orderBy(emailTemplates.createdAt)
          .limit(Number(limit))
          .offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(emailTemplates),
      ]);

      const [{ count }] = countResult;

      const response = {
        success: true,
        templates: result,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalTemplates: Number(count),
          totalPages: Math.ceil(Number(count) / Number(limit)),
        },
      };

      await redisClient.setEx(cacheKey, 300, JSON.stringify(response));
      return res.status(200).json(response);
    } catch (error) {
      console.error("Get email templates error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // Get Template by ID or Type
  static async getTemplate(req: Request, res: Response) {
    try {
      const { id, type } = req.params;

      let query;
      if (id) {
        query = eq(emailTemplates.id, id);
      } else if (type) {
        query = eq(emailTemplates.type, type);
      } else {
        return res
          .status(400)
          .json({ message: "Provide either ID or Type to fetch template" });
      }

      const [template] = await db.select().from(emailTemplates).where(query);

      if (!template)
        return res.status(404).json({ message: "Email template not found" });

      return res.status(200).json({ success: true, template });
    } catch (error) {
      console.error("Get email template error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // Delete Template
  static async deleteTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [deleted] = await db
        .delete(emailTemplates)
        .where(eq(emailTemplates.id, id))
        .returning({ id: emailTemplates.id });

      if (!deleted) {
        return res.status(404).json({ message: "Email template not found" });
      }

      await invalidateEmailTemplatesCache();

      return res.status(200).json({
        success: true,
        message: "Email template deleted successfully",
      });
    } catch (error) {
      console.error("Delete email template error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default EmailTemplateController;
