// import { Request, Response } from "express";
// import { db } from "../db/dbConnection";
// import { config } from "../db/schema/config.schema";
// import { eq } from "drizzle-orm";

// class ConfigController {
//   // Create or Update Config
//   static async updateOrCreateConfig(req: Request, res: Response) {
//     try {
//       const body = req.body || {};
//       const { minimumBalanceRequirement, emailTemplate } = body;
//       console.log("mbr recieved", minimumBalanceRequirement);

//       // File handling (logo upload via S3)
//       const file = req.file as Express.MulterS3.File;
//       const logo = file
//         ? {
//             url: file.location,
//             key: file.key,
//             name: file.originalname,
//             size: file.size,
//             mimetype: file.mimetype,
//           }
//         : null;

//       // Only one config row (singleton)
//       const [existingConfig] = await db.select().from(config).limit(1);

//       let updated;
//       if (existingConfig) {
//         [updated] = await db
//           .update(config)
//           .set({
//             ...(minimumBalanceRequirement && {
//               minimumBalanceRequirement: minimumBalanceRequirement,
//             }),
//             ...(emailTemplate && { emailTemplate }),
//             ...(logo && { logoUrl: logo.url }),
//             updatedAt: new Date(),
//           })
//           .where(eq(config.id, existingConfig.id))
//           .returning();
//       } else {
//         [updated] = await db
//           .insert(config)
//           .values({
//             minimumBalanceRequirement: minimumBalanceRequirement || "0.00",
//             emailTemplate: emailTemplate || "",
//             ...(logo && { logoUrl: logo.url }),
//           })
//           .returning();
//       }

//       return res.status(200).json({
//         success: true,
//         message: "System config saved successfully",
//         config: updated,
//       });
//     } catch (error) {
//       console.error("updateOrCreateConfig error:", error);
//       return res.status(500).json({ message: "Internal server error" });
//     }
//   }

//   // Get full config
//   static async getConfig(_req: Request, res: Response) {
//     try {
//       const [systemConfig] = await db.select().from(config).limit(1);

//       if (!systemConfig) {
//         return res
//           .status(404)
//           .json({ success: false, message: "System config not found" });
//       }

//       return res.status(200).json({ success: true, config: systemConfig });
//     } catch (error) {
//       console.error("getConfig error:", error);
//       return res.status(500).json({ message: "Internal server error" });
//     }
//   }

//   // Get only email template
//   static async getEmailTemplate(_req: Request, res: Response) {
//     try {
//       const [systemConfig] = await db
//         .select({ emailTemplate: config.emailTemplate })
//         .from(config)
//         .limit(1);

//       if (!systemConfig) {
//         return res
//           .status(404)
//           .json({ success: false, message: "Email template not found" });
//       }

//       return res.status(200).json({
//         success: true,
//         emailTemplate: systemConfig.emailTemplate,
//       });
//     } catch (error) {
//       console.error("getEmailTemplate error:", error);
//       return res.status(500).json({ message: "Internal server error" });
//     }
//   }
// }

// export default ConfigController;

import { Request, Response } from "express";
import { db } from "../db/dbConnection";
import { config } from "../db/schema/config.schema";
import { eq } from "drizzle-orm";
import redisClient from "../config/redis";

const CONFIG_CACHE_KEY = "config:system";

const invalidateConfigCache = async () => {
  try {
    await redisClient.del(CONFIG_CACHE_KEY);
  } catch (err) {
    console.error("Error invalidating config cache:", err);
  }
};

class ConfigController {
  // Create or Update Config
  static async updateOrCreateConfig(req: Request, res: Response) {
    try {
      const body = req.body || {};
      const { minimumBalanceRequirement, emailTemplate } = body;

      // File handling (logo upload via S3)
      const file = req.file as Express.MulterS3.File;
      const logo = file
        ? {
            url: file.location,
            key: file.key,
            name: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
          }
        : null;

      // Only one config row (singleton)
      const [existingConfig] = await db.select().from(config).limit(1);

      let updated;
      if (existingConfig) {
        [updated] = await db
          .update(config)
          .set({
            ...(minimumBalanceRequirement && {
              minimumBalanceRequirement,
            }),
            ...(emailTemplate && { emailTemplate }),
            ...(logo && { logoUrl: logo.url }),
            updatedAt: new Date(),
          })
          .where(eq(config.id, existingConfig.id))
          .returning();
      } else {
        [updated] = await db
          .insert(config)
          .values({
            minimumBalanceRequirement: minimumBalanceRequirement || "0.00",
            emailTemplate: emailTemplate || "",
            ...(logo && { logoUrl: logo.url }),
          })
          .returning();
      }

      // Invalidate cache
      await invalidateConfigCache();

      return res.status(200).json({
        success: true,
        message: "System config saved successfully",
        config: updated,
      });
    } catch (error) {
      console.error("updateOrCreateConfig error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // Get full config
  static async getConfig(_req: Request, res: Response) {
    try {
      // Check cache first
      const cached = await redisClient.get(CONFIG_CACHE_KEY);
      if (cached) {
        return res.status(200).json(JSON.parse(cached));
      }

      const [systemConfig] = await db.select().from(config).limit(1);

      if (!systemConfig) {
        return res
          .status(404)
          .json({ success: false, message: "System config not found" });
      }

      const response = { success: true, config: systemConfig };

      // Cache for 5 min
      await redisClient.setEx(CONFIG_CACHE_KEY, 300, JSON.stringify(response));

      return res.status(200).json(response);
    } catch (error) {
      console.error("getConfig error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // Get only email template
  static async getEmailTemplate(_req: Request, res: Response) {
    try {
      // Check cache first
      const cached = await redisClient.get(CONFIG_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.config?.emailTemplate) {
          return res.status(200).json({
            success: true,
            emailTemplate: parsed.config.emailTemplate,
          });
        }
      }

      const [systemConfig] = await db
        .select({ emailTemplate: config.emailTemplate })
        .from(config)
        .limit(1);

      if (!systemConfig) {
        return res
          .status(404)
          .json({ success: false, message: "Email template not found" });
      }

      // Cache whole config again (so both getConfig + getEmailTemplate benefit)
      await redisClient.setEx(
        CONFIG_CACHE_KEY,
        300,
        JSON.stringify({ success: true, config: systemConfig })
      );

      return res.status(200).json({
        success: true,
        emailTemplate: systemConfig.emailTemplate,
      });
    } catch (error) {
      console.error("getEmailTemplate error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default ConfigController;
