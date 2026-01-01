// export default ExternalProviderController;
import { Request, Response } from "express";
import { db } from "../db/dbConnection";
import { externalProviders } from "../db/schema/externalProviders.schema";
import redisClient from "../config/redis";
import { eq } from "drizzle-orm";
import axios from "axios";
import FormData from "form-data";

const CACHE_KEY = "external:providers";

class ExternalProviderController {
  /* ================================
     GET ALL PROVIDERS
  ================================ */
  static async getAll(_req: Request, res: Response) {
    try {
      const cached = await redisClient.get(CACHE_KEY);
      if (cached) {
        return res.status(200).json(JSON.parse(cached));
      }

      const providers = await db.select().from(externalProviders);

      // Mask secrets
      // const sanitized = providers.map((p) => ({
      //   ...p,
      //   password: p.password ? "********" : null,
      //   token: p.token ? "********" : null,
      // }));

      const response = { success: true, providers: providers };
      await redisClient.setEx(CACHE_KEY, 300, JSON.stringify(response));

      return res.status(200).json(response);
    } catch (error) {
      console.error("getAll error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /* ================================
     CREATE PROVIDER
  ================================ */
  static async create(req: Request, res: Response) {
    try {
      const {
        providerName,
        hostUrl,
        username,
        password,
        token,
        currency,
        active = true,
      } = req.body;

      const [created] = await db
        .insert(externalProviders)
        .values({
          providerName,
          hostUrl,
          username,
          password,
          token,
          currency,
          active,
        })
        .returning();

      await redisClient.del(CACHE_KEY);

      return res.status(201).json({
        success: true,
        provider: created,
      });
    } catch (error) {
      console.error("create error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /* ================================
     UPDATE PROVIDER
  ================================ */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        providerName,
        hostUrl,
        username,
        password,
        token,
        currency,
        active,
      } = req.body;

      const [updated] = await db
        .update(externalProviders)
        .set({
          providerName,
          hostUrl,
          username,
          ...(password && { password }),
          ...(token && { token }),
          currency,
          active,
          updatedAt: new Date(),
        })
        .where(eq(externalProviders.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Provider not found" });
      }

      await redisClient.del(CACHE_KEY);

      return res.status(200).json({
        success: true,
        provider: updated,
      });
    } catch (error) {
      console.error("update error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /* ================================
     DELETE PROVIDER
  ================================ */
  static async remove(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [deleted] = await db
        .delete(externalProviders)
        .where(eq(externalProviders.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Provider not found" });
      }

      await redisClient.del(CACHE_KEY);

      return res.status(200).json({
        success: true,
        message: "Provider deleted",
      });
    } catch (error) {
      console.error("delete error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async testProvider(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [provider] = await db
        .select()
        .from(externalProviders)
        .where(eq(externalProviders.id, id))
        .limit(1);

      if (!provider) {
        return res.status(404).json({
          success: false,
          message: "Provider not found",
        });
      }

      const base = provider.hostUrl.replace(/\/$/, "");
      const url =
        provider.username && provider.token
          ? `${base}/${provider.username}/${provider.token}`
          : base;

      const formData = new FormData();
      formData.append("request", "balance");

      const response = await axios.post(url, formData, {
        headers: formData.getHeaders(),
        timeout: 10000,
      });

      if (response.data?.status === true) {
        return res.status(200).json({
          success: true,
          working: true,
          response: response.data,
        });
      }

      return res.status(200).json({
        success: true,
        working: false,
        response: response.data,
      });
    } catch (error: any) {
      console.error("testProvider error:", error?.message);

      return res.status(500).json({
        success: false,
        working: false,
        message: "API provider test failed",
      });
    }
  }
}

export default ExternalProviderController;
