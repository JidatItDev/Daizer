import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db/dbConnection";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../utils/crypto.utils";
import { createAccessToken, createRefreshToken } from "../utils/jwt.utils";

class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      const [existingUser] = await db
        .select({
          id: users.id,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return res.status(409).json({ message: "Email already in use" });
      }

      const hashedPassword = await hashPassword(password);

      const [newUser] = await db
        .insert(users)
        .values({
          name,
          email,
          password: hashedPassword,
          role: "user",
          isActive: true,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          createdAt: users.createdAt,
        });
      if (!newUser.id || !newUser.role) {
        return res.status(500).json({ message: "User data is incomplete" });
      }
      const accessToken = createAccessToken(newUser.id, newUser.role);
      const refreshToken = createRefreshToken(newUser.id);
      return res.status(201).json({
        message: "User registered successfully",
        accessToken,
        refreshToken,
        success: true,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

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

      const payload = jwt.verify(token, secret!) as {
        id: string;
      };

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.id))
        .limit(1);
      if (!user)
        return res.status(401).json({ message: "Invalid refresh token" });

      if (!user.id || !user.role) {
        return res.status(500).json({ message: "Invalid user data" });
      }

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

      return res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default AuthController;
