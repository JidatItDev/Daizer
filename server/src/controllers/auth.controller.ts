import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db/dbConnection";
import { pricingGroups, users } from "../db/schema";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../utils/crypto.utils";
import {
  createAccessToken,
  createRefreshToken,
  createResetToken,
  verifyResetToken,
} from "../utils/jwt.utils";
import { EmailService } from "../services/email.service";
import redisClient from "../config/redis";

class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          password: users.password,
          role: users.role,
          name: users.name,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) return res.status(404).json({ message: "User not found" });

      const isMatch = await verifyPassword(password, user.password);
      if (!isMatch)
        return res.status(401).json({ message: "Invalid credentials" });
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
        const newAccessToken = createAccessToken(payload.id, payload.role);
        return res.json({ accessToken: newAccessToken });
      }

      const payload = jwt.verify(token, secret) as { id: string };

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.id))
        .limit(1);

      if (!user)
        return res.status(401).json({ message: "Invalid refresh token" });

      // Cache token validation for 30 minutes
      await redisClient.setEx(
        cacheKey,
        1800,
        JSON.stringify({ id: user.id, role: user.role })
      );

      const newAccessToken = createAccessToken(user.id, user.role);
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

    await EmailService.sendPasswordResetLinkEmail(email, resetLink);

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
    try {
      const { email, password, name, pricingGroupId } = req.body;

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

      const [newUser] = await db
        .insert(users)
        .values({
          name,
          email,
          password: hashedPassword,
          role: "user",
          isActive: true,
          pricingGroupId: finalPricingGroupId,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          pricingGroupId: users.pricingGroupId,
          createdAt: users.createdAt,
        });

      if (!newUser.id || !newUser.role) {
        return res.status(500).json({ message: "User data is incomplete" });
      }

      const accessToken = createAccessToken(newUser.id, newUser.role);
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
      return res.status(500).json({ message: "Internal server error" });
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

      const [newUser] = await db
        .insert(users)
        .values({
          name,
          email,
          password: hashedPassword,
          role,
          isActive,
          pricingGroupId: finalPricingGroupId,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          pricingGroupId: users.pricingGroupId,
          createdAt: users.createdAt,
        });

      await redisClient.del("users:page:*");

      return res.status(201).json({
        success: true,
        message: "User created successfully",
        user: newUser,
      });
    } catch (error) {
      console.error("Create user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, role, isActive, pricingGroupId } = req.body;

      const [updatedUser] = await db
        .update(users)
        .set({
          ...(name && { name }),
          ...(role && { role }),
          ...(isActive !== undefined && { isActive }),
          ...(pricingGroupId !== undefined && { pricingGroupId }),
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          pricingGroupId: users.pricingGroupId,
          updatedAt: users.updatedAt,
        });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await redisClient.del("users:page:*");

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getAllUsers(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        status, // true | false
        "pricingGroupIds[]": pricingGroupIds, // array of ids
        sortField = "createdAt",
        sortOrder = "desc",
      } = req.query;
      console.log("req.query", req.query);

      const offset = (Number(page) - 1) * Number(limit);

      // Build filters
      const conditions = [];
      if (status !== undefined) {
        // status comes as string "true"/"false" → convert to boolean
        conditions.push(
          eq(users.isActive, status === "true" || status === true)
        );
      }
      if (pricingGroupIds) {
        const ids = Array.isArray(pricingGroupIds)
          ? pricingGroupIds
          : [pricingGroupIds];
        conditions.push(inArray(users.pricingGroupId, ids));
      }

      console.log("object filters", {
        status,
        pricingGroupIds,
      });

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Sorting
      const allowedSortFields: Record<string, any> = {
        name: users.name,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      };
      const orderByField =
        allowedSortFields[String(sortField)] || users.createdAt;
      const orderDirection =
        String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc";

      console.log("whereClause", whereClause);

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
          })
          .from(users)
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
        users: result,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalUsers: Number(count),
          totalPages: Math.ceil(Number(count) / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get users error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [user] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
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
}

export default AuthController;
