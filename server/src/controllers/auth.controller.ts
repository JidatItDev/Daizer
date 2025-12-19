import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../db/dbConnection";
import { pricingGroups, transactions, users, wallets } from "../db/schema";
import { and, asc, desc, eq, inArray, sql, lt } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../utils/crypto.utils";
import {
  createAccessToken,
  createRefreshToken,
  createResetToken,
  verifyResetToken,
} from "../utils/jwt.utils";
import { EmailService } from "../services/email.service";
import redisClient from "../config/redis";
import { signupLinks } from "../db/schema/signupLinks.schema";
import { ZohoService } from "../services/zoho.service";
import { ZohoContactService } from "../services/ZohoServices/zohoContact.service";

class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          password: users.password,
          role: users.role,
          name: users.name,
          isActive: users.isActive,
          pricingGroupId: users.pricingGroupId,
        })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (!user) return res.status(404).json({ message: "User not found" });

      const isMatch = await verifyPassword(password, user.password);
      if (!isMatch)
        return res.status(401).json({ message: "Invalid credentials" });
      if (!user.isActive) {
        return res.status(403).json({ message: "User account is inactive" });
      }
      if (!user.id || !user.role) {
        return res.status(500).json({ message: "User data is incomplete" });
      }

      const accessToken = createAccessToken(user.id, user.role);
      const refreshToken = createRefreshToken(user.id);

      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      return res.status(200).json({
        message: "User Logged in successfully",
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          pricingGroupId: user.pricingGroupId,
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { token } = req.body;
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error("JWT_SECRET is not defined");

      const cacheKey = `token:${token}`;
      const cachedPayload = await redisClient.get(cacheKey);

      if (cachedPayload) {
        const payload = JSON.parse(cachedPayload);

        // Ensure user is still active
        const [user] = await db
          .select({ isActive: users.isActive })
          .from(users)
          .where(eq(users.id, payload.id))
          .limit(1);

        if (!user || !user.isActive) {
          return res.status(403).json({ message: "User account is inactive" });
        }

        const newAccessToken = createAccessToken(payload.id, payload.role);
        return res.json({ accessToken: newAccessToken });
      }

      const payload = jwt.verify(token, secret) as { id: string };

      const [user] = await db
        .select({ id: users.id, role: users.role, isActive: users.isActive })
        .from(users)
        .where(eq(users.id, payload.id))
        .limit(1);

      if (!user || !user.isActive) {
        return res.status(403).json({ message: "User account is inactive" });
      }

      // Cache token validation for 30 minutes
      await redisClient.setEx(
        cacheKey,
        1800,
        JSON.stringify({ id: user.id, role: user.role })
      );

      const newAccessToken = createAccessToken(user.id, user.role!);
      return res.json({ accessToken: newAccessToken });
    } catch (err) {
      console.error("Refresh error:", err);
      return res
        .status(403)
        .json({ message: "Invalid or expired refresh token" });
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const { currentPassword, newPassword } = req.body;

      const [user] = await db
        .select({
          id: users.id,
          password: users.password,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) return res.status(404).json({ message: "User not found" });

      const isMatch = await verifyPassword(currentPassword, user.password);
      if (!isMatch) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }

      const hashedNewPassword = await hashPassword(newPassword);

      await db
        .update(users)
        .set({ password: hashedNewPassword })
        .where(eq(users.id, userId));

      // Invalidate cache for this user
      await Promise.all([
        redisClient.del(`user:${user.email}`),
        redisClient.del(`token:*`), // Invalidate all tokens (be careful with this in production)
      ]);

      return res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async sendResetLink(req: Request, res: Response) {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return res.status(404).json({ error: "User not found" });

    const token = createResetToken(email);

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await EmailService.sendTemplateEmail("forgotPassword", email, {
      link: resetLink,
      resetLink,
    });

    return res.json({
      success: true,
      message: "Password reset link sent to email",
    });
  }

  static async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body;

    if (!token || !newPassword)
      return res.status(400).json({ error: "Token and new password required" });

    let email: string;
    try {
      const payload = verifyResetToken(token);
      email = payload.email;
    } catch (err) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return res.status(404).json({ error: "User not found" });

    const hashed = await hashPassword(newPassword);

    await db
      .update(users)
      .set({ password: hashed })
      .where(eq(users.email, email));

    return res.json({ success: true, message: "Password has been reset" });
  }

  static async register(req: Request, res: Response) {
    const { email, password, name, pricingGroupId } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    try {
      // 1️⃣ Check if email already exists
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existingUser) {
        return res.status(409).json({ message: "Email already in use" });
      }

      const hashedPassword = await hashPassword(password);

      // 2️⃣ Resolve pricing group
      let finalPricingGroupId = pricingGroupId;
      let pricingGroupName: string | undefined;

      if (!finalPricingGroupId) {
        const [defaultGroup] = await db
          .select({ id: pricingGroups.id, name: pricingGroups.name })
          .from(pricingGroups)
          .where(eq(pricingGroups.isDefault, true))
          .limit(1);
        finalPricingGroupId = defaultGroup?.id || null;
        pricingGroupName = defaultGroup?.name;
      } else {
        const [selectedGroup] = await db
          .select({ name: pricingGroups.name })
          .from(pricingGroups)
          .where(eq(pricingGroups.id, pricingGroupId))
          .limit(1);
        pricingGroupName = selectedGroup?.name;
      }

      // 3️⃣ Run DB operations in a transaction
      const newUser = await db.transaction(async (tx) => {
        const zohoContactService = new ZohoContactService();

        // Create Zoho contact
        const zohoContact = await zohoContactService.createOrGetZohoContact({
          name,
          email: normalizedEmail,
          pricingGroupName,
        });

        // ✅ Validate Zoho response
        if (!zohoContact || !zohoContact.contact_id) {
          throw new Error("Zoho contact creation failed");
        }

        // Insert user
        const [createdUser] = await tx
          .insert(users)
          .values({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role: "user",
            isActive: true,
            pricingGroupId: finalPricingGroupId,
            zohoContactId: zohoContact.contact_id,
            zohoContactStatus: zohoContact.contact_status || "active",
            zohoCreatedAt: zohoContact.created_time
              ? new Date(zohoContact.created_time)
              : new Date(), // fallback
            zohoCompanyName: zohoContact.company_name || name,
          })
          .returning({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            pricingGroupId: users.pricingGroupId,
            createdAt: users.createdAt,
            zohoContactId: users.zohoContactId,
          });

        // Insert wallet
        await tx.insert(wallets).values({
          userId: createdUser.id,
          balance: "0",
        });

        return createdUser;
      });

      // 4️⃣ Generate tokens
      const accessToken = createAccessToken(newUser.id, newUser.role || "");
      const refreshToken = createRefreshToken(newUser.id);

      await redisClient.del("users:page:*");

      return res.status(201).json({
        message: "User registered successfully",
        accessToken,
        refreshToken,
        success: true,
        user: newUser,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      return res.status(500).json({
        message: error.message || "Internal server error",
      });
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const {
        email,
        password,
        name,
        role = "user",
        isActive = true,
        pricingGroupId,
      } = req.body;

      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return res.status(409).json({ message: "Email already in use" });
      }

      const hashedPassword = await hashPassword(password);

      // resolve pricingGroupId
      let finalPricingGroupId = pricingGroupId;
      if (!finalPricingGroupId) {
        const [defaultGroup] = await db
          .select({ id: pricingGroups.id })
          .from(pricingGroups)
          .where(eq(pricingGroups.isDefault, true))
          .limit(1);
        finalPricingGroupId = defaultGroup?.id || null;
      }
    } catch (error) {
      console.error("Create user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, role, isActive, pricingGroupId } = req.body;
      const zohoContactService = new ZohoContactService();
      const [existingUser] = await db
        .select({
          zohoContactId: users.zohoContactId,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const isToggleRequest =
        Object.keys(req.body).length === 1 && typeof isActive === "boolean";

      // 🔹 CASE 1: Toggle active/inactive ONLY
      if (isToggleRequest) {
        const [updatedUser] = await db
          .update(users)
          .set({
            isActive,
            updatedAt: new Date(),
          })
          .where(eq(users.id, id))
          .returning({
            id: users.id,
            isActive: users.isActive,
          });
        if (isToggleRequest && existingUser.zohoContactId) {
          await zohoContactService.setActiveStatus(
            existingUser.zohoContactId,
            isActive
          );
        }

        await redisClient.del("users:page:*");

        return res.status(200).json({
          success: true,
          message: "User status updated",
          user: updatedUser,
        });
      }

      // 🔹 CASE 2: Full profile update
      let pricingGroupName: string | undefined;

      if (pricingGroupId !== undefined) {
        const [pricingGroup] = await db
          .select({ name: pricingGroups.name })
          .from(pricingGroups)
          .where(eq(pricingGroups.id, pricingGroupId))
          .limit(1);

        if (!pricingGroup) {
          return res.status(404).json({
            success: false,
            message: "Pricing group not found",
          });
        }

        pricingGroupName = pricingGroup.name;
      }

      const result = await db.transaction(async (tx) => {
        if (existingUser.zohoContactId) {
          await zohoContactService.updateContactInZohoBooks(
            existingUser.zohoContactId,
            {
              name,
              pricingGroupName,
              pricingGroupId,
            }
          );
        }

        const [updatedUser] = await tx
          .update(users)
          .set({
            ...(name !== undefined && { name }),
            ...(role !== undefined && { role }),
            ...(pricingGroupId !== undefined && { pricingGroupId }),
            updatedAt: new Date(),
          })
          .where(eq(users.id, id))
          .returning();

        return updatedUser;
      });

      await redisClient.del("users:page:*");

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        user: result,
      });
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  static async getAllUsers(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        "pricingGroupIds[]": pricingGroupIds,
        sortField = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      // Filters
      const conditions = [];
      if (status !== undefined) {
        conditions.push(eq(users.isActive, status === "true"));
      }

      if (pricingGroupIds) {
        const ids = Array.isArray(pricingGroupIds)
          ? pricingGroupIds
          : [pricingGroupIds];
        conditions.push(inArray(users.pricingGroupId, ids as string[]));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Sorting
      const allowedSortFields: Record<string, any> = {
        name: users.name,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        balance: wallets.balance, // ✅ allow sorting by wallet balance
      };

      const orderByField =
        allowedSortFields[String(sortField)] || users.createdAt;

      const orderDirection =
        String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc";

      const [result, countResult] = await Promise.all([
        db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            isActive: users.isActive,
            pricingGroupId: users.pricingGroupId,
            createdAt: users.createdAt,
            lastLoginAt: users.lastLoginAt,

            // 💰 Wallet fields
            walletId: wallets.id,
            balance: wallets.balance,
            currency: wallets.currency,
            walletUpdatedAt: wallets.updatedAt,
          })
          .from(users)
          .leftJoin(wallets, eq(wallets.userId, users.id))
          .where(whereClause || sql`true`)
          .orderBy(
            orderDirection === "asc" ? asc(orderByField) : desc(orderByField)
          )
          .limit(Number(limit))
          .offset(offset),

        db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(whereClause || sql`true`),
      ]);

      const [{ count }] = countResult;

      return res.status(200).json({
        success: true,
        users: result.map((u) => ({
          ...u,
          balance: u.balance ? Number(u.balance) : 0, // numeric → number
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalUsers: Number(count),
          totalPages: Math.ceil(Number(count) / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get users error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          zohoContactId: users.zohoContactId,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // ✅ Delete/deactivate from Zoho first
      let zohoResult = null;
      if (user.zohoContactId) {
        const zohoCustomerService = new ZohoContactService();

        try {
          zohoResult = await zohoCustomerService.smartDeleteCustomer(
            user.zohoContactId
          );
          console.log(
            `✅ Zoho action: ${zohoResult.action}`,
            zohoResult.message
          );
        } catch (error: any) {
          console.error("❌ Failed to delete from Zoho:", error.message);
          // Continue with local deletion even if Zoho fails
          // Or you can choose to return error here:
          // return res.status(500).json({
          //   success: false,
          //   message: "Failed to sync with Zoho Books"
          // });
        }
      }

      await db.delete(users).where(eq(users.id, id));

      await Promise.all([
        redisClient.del("users:page:*"),
        redisClient.del(`user:${user.email}`),
      ]);

      return res.status(200).json({
        success: true,
        message: "User deleted permanently",
      });
    } catch (error) {
      console.error("Delete user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async createSignupLink(req: Request, res: Response) {
    try {
      const { email, name, pricingGroupId } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      // check if email already used
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (existingUser) {
        return res.status(409).json({ message: "Email already in use" });
      }

      // generate token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hrs

      const [link] = await db
        .insert(signupLinks)
        .values({
          email: normalizedEmail,
          name,
          pricingGroupId,
          token,
          expiresAt,
        })
        .returning();

      const signupUrl = `${process.env.FRONTEND_URL}/register?token=${token}`;

      await EmailService.sendTemplateEmail("signupLink", email, {
        name,
        signupUrl,
        email,
      });

      return res.status(201).json({
        success: true,
        message: "Signup link created and sent",
        link,
      });
    } catch (err) {
      console.error("Create signup link error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async registerWithLink(req: Request, res: Response) {
    try {
      const { token, password } = req.body;

      const [link] = await db
        .select()
        .from(signupLinks)
        .where(eq(signupLinks.token, token))
        .limit(1);

      if (!link) return res.status(404).json({ message: "Invalid link" });
      if (link.isUsed)
        return res
          .status(400)
          .json({ message: "Link already used please login to continue" });
      if (new Date(link.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Link expired" });
      }

      const hashedPassword = await hashPassword(password);
      let finalPricingGroupId = link.pricingGroupId;
      let pricingGroupName: string | undefined;

      if (!finalPricingGroupId) {
        const [defaultGroup] = await db
          .select({ id: pricingGroups.id, name: pricingGroups.name })
          .from(pricingGroups)
          .where(eq(pricingGroups.isDefault, true))
          .limit(1);
        finalPricingGroupId = defaultGroup?.id || null;
        pricingGroupName = defaultGroup?.name;
      } else {
        const [selectedGroup] = await db
          .select({ name: pricingGroups.name })
          .from(pricingGroups)
          .where(eq(pricingGroups.id, link.pricingGroupId || ""))
          .limit(1);
        pricingGroupName = selectedGroup?.name;
      }

      const newUser = await db.transaction(async (tx) => {
        const zohoContactService = new ZohoContactService();

        // Create Zoho contact
        const zohoContact = await zohoContactService.createOrGetZohoContact({
          name: link.name,
          email: link.email,
          pricingGroupName: pricingGroupName,
        });

        // ✅ Validate Zoho response
        if (!zohoContact || !zohoContact.contact_id) {
          throw new Error("Zoho contact creation failed");
        }

        const [newUser] = await tx
          .insert(users)
          .values({
            name: link.name,
            email: link.email,
            password: hashedPassword,
            role: "user",
            isActive: true,
            pricingGroupId: link.pricingGroupId,

            // 🧩 Save Zoho info
            zohoContactId: zohoContact.contact_id,
            zohoContactStatus: zohoContact.contact_status || "active",
            zohoCreatedAt: new Date(),
            zohoCompanyName: zohoContact.company_name || link.name,
          })
          .returning();

        await tx.insert(wallets).values({
          userId: newUser.id,
          balance: "0",
        });

        // mark link as used
        await tx
          .update(signupLinks)
          .set({ isUsed: true })
          .where(eq(signupLinks.id, link.id));
        return newUser;
      });
      const accessToken = createAccessToken(newUser.id, newUser.role || "");
      const refreshToken = createRefreshToken(newUser.id);

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: newUser,
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error("Register with link error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getAllSignupLinks(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        "pricingGroupIds[]": pricingGroupIds,
        sortField = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const conditions: any[] = [];

      if (status === "used") {
        conditions.push(eq(signupLinks.isUsed, true));
      } else if (status === "unused") {
        conditions.push(eq(signupLinks.isUsed, false));
      } else if (status === "expired") {
        conditions.push(lt(signupLinks.expiresAt, new Date()));
      }

      if (pricingGroupIds) {
        const ids = Array.isArray(pricingGroupIds)
          ? pricingGroupIds
          : [pricingGroupIds];
        conditions.push(inArray(signupLinks.pricingGroupId, ids as string[]));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const allowedSortFields: Record<string, any> = {
        email: signupLinks.email,
        name: signupLinks.name,
        createdAt: signupLinks.createdAt,
        expiresAt: signupLinks.expiresAt,
      };

      const orderByField =
        allowedSortFields[String(sortField)] || signupLinks.createdAt;
      const orderDirection =
        String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc";

      const [result, countResult] = await Promise.all([
        db
          .select({
            id: signupLinks.id,
            email: signupLinks.email,
            name: signupLinks.name,
            pricingGroupId: signupLinks.pricingGroupId,
            token: signupLinks.token,
            isUsed: signupLinks.isUsed,
            expiresAt: signupLinks.expiresAt,
            createdAt: signupLinks.createdAt,
          })
          .from(signupLinks)
          .where(whereClause || sql`true`)
          .orderBy(
            orderDirection === "asc" ? asc(orderByField) : desc(orderByField)
          )
          .limit(Number(limit))
          .offset(offset),

        db
          .select({ count: sql<number>`count(*)` })
          .from(signupLinks)
          .where(whereClause || sql`true`),
      ]);

      const [{ count }] = countResult;

      return res.status(200).json({
        success: true,
        links: result,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalLinks: Number(count),
          totalPages: Math.ceil(Number(count) / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get signup links error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getSignupLinkByToken(req: Request, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        return res
          .status(400)
          .json({ success: false, message: "Token is required" });
      }

      const [signupLink] = await db
        .select({
          id: signupLinks.id,
          email: signupLinks.email,
          name: signupLinks.name,
          pricingGroupId: signupLinks.pricingGroupId,
          token: signupLinks.token,
          isUsed: signupLinks.isUsed,
          expiresAt: signupLinks.expiresAt,
          createdAt: signupLinks.createdAt,
        })
        .from(signupLinks)
        .where(eq(signupLinks.token, token))
        .limit(1);

      if (!signupLink) {
        return res
          .status(404)
          .json({ success: false, message: "Signup link not found" });
      }

      return res.status(200).json({
        success: true,
        link: signupLink,
      });
    } catch (error) {
      console.error("Get signup link by token error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
  static async getUserByIdWithWalletAndPurchases(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res
          .status(400)
          .json({ success: false, message: "User id is required" });
      }

      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          isActive: users.isActive,
          email: users.email,

          // Wallet
          walletId: wallets.id,
          balance: wallets.balance,
          currency: wallets.currency,

          // Pricing group
          pricingGroupId: pricingGroups.id,
          pricingGroupName: pricingGroups.name,
        })
        .from(users)
        .leftJoin(wallets, eq(wallets.userId, users.id))
        .leftJoin(pricingGroups, eq(pricingGroups.id, users.pricingGroupId))
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      /* 2️⃣ Get purchase transactions of this user */
      const purchases = await db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          currency: transactions.currency,
          status: transactions.status,
          referenceId: transactions.referenceId,
          metadata: transactions.metadata,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .where(
          and(eq(transactions.userId, id), eq(transactions.type, "purchase"))
        )
        .orderBy(desc(transactions.createdAt));

      /* 3️⃣ Response */
      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          status: user.isActive,
          email: user.email,

          pricingGroup: {
            id: user.pricingGroupId,
            name: user.pricingGroupName,
          },

          wallet: {
            id: user.walletId,
            balance: user.balance ? Number(user.balance) : 0,
            currency: user.currency,
          },

          purchases: purchases.map((trx) => ({
            ...trx,
            amount: Number(trx.amount),
          })),
        },
      });
    } catch (error) {
      console.error("Get user by id error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

export default AuthController;
