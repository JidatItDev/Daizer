import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import { validateSchema } from "../middlewares/zod.middleware";
import {
  loginSchema,
  refreshSchema,
  registerSchema,
} from "../validators/auth.schema";
import { authenticate } from "../middlewares/auth.middleware";

const authRouter = Router();

authRouter.post(
  "/register",
  validateSchema(registerSchema),
  AuthController.register
);
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: strongpassword123
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       409:
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email already in use
 *       500:
 *         description: Internal server error
 */

authRouter.post("/login", validateSchema(loginSchema), AuthController.login);
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: strongpassword123
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR...
 *                 refreshToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     email:
 *                       type: string
 *                       format: email
 *                     role:
 *                       type: string
 *                       example: user
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid credentials
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Internal server error
 */

authRouter.post(
  "/refresh",
  validateSchema(refreshSchema),
  AuthController.refresh
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using a refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Successfully refreshed access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR...
 *       401:
 *         description: Invalid refresh token (user not found)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid refresh token
 *       403:
 *         description: Token is invalid or expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid or expired refresh token
 */

authRouter.post(
  "/change-password",
  authenticate,
  AuthController.changePassword
);
/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change the user's password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 example: "b7b1cdd6-4b7f-45d6-aaf6-c7c4b88870e7"
 *               currentPassword:
 *                 type: string
 *                 example: OldPassword123
 *               newPassword:
 *                 type: string
 *                 example: NewSecurePassword456
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password updated successfully
 *       400:
 *         description: Missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: New password must be at least 8 characters
 *       401:
 *         description: Current password is incorrect or token missing/invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Current password is incorrect
 *       500:
 *         description: Internal server error
 */

authRouter.post("/password-reset-mail", AuthController.sendResetLink);

/**
 * @swagger
 * /auth/password-reset-mail:
 *   post:
 *     summary: Send password reset link to user's email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset link sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password reset link sent to email
 *       400:
 *         description: Email is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Email is required
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Internal server error
 */

authRouter.post("/reset-password", AuthController.resetPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset user's password using reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               newPassword:
 *                 type: string
 *                 example: NewSecurePassword456
 *     responses:
 *       200:
 *         description: Password has been reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password has been reset
 *       400:
 *         description: Missing fields or invalid/expired token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid or expired token
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Internal server error
 */

// routes/authRoutes.ts

authRouter.post("/create-user", authenticate, AuthController.createUser);
/**
 * @swagger
 * /auth/create-user:
 *   post:
 *     summary: Create a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane.doe@example.com"
 *               password:
 *                 type: string
 *                 example: "StrongPass123!"
 *               name:
 *                 type: string
 *                 example: "Jane Doe"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User created successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "c1a2b3c4-d5e6-7890-f1a2-b3c4d5e67890"
 *                     name:
 *                       type: string
 *                       example: "Jane Doe"
 *                     email:
 *                       type: string
 *                       example: "jane.doe@example.com"
 *                     role:
 *                       type: string
 *                       example: user
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Internal server error
 */

authRouter.get(
  "/user/:id",
  authenticate,
  AuthController.getUserByIdWithWalletAndPurchases
);

authRouter.get("/orders", authenticate, AuthController.getAllOrders);
authRouter.get("/myOrders", authenticate, AuthController.getMyOrders);
authRouter.get("/users", authenticate, AuthController.getAllUsers);
/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: Get all users
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "a123b456-c789-012d-345e-6789f0a123b4"
 *                       name:
 *                         type: string
 *                         example: "John Doe"
 *                       email:
 *                         type: string
 *                         example: "john.doe@example.com"
 *                       role:
 *                         type: string
 *                         example: "user"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-08-18T10:00:00.000Z"
 *       500:
 *         description: Internal server error
 */

authRouter.put("/users/:id", authenticate, AuthController.updateUser);

/**
 * @swagger
 * /auth/users/{id}:
 *   put:
 *     summary: Update an existing user
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Jane Doe Updated"
 *               role:
 *                 type: string
 *                 example: "admin"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               pricingGroupId:
 *                 type: string
 *                 format: uuid
 *                 example: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User updated successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "c1a2b3c4-d5e6-7890-f1a2-b3c4d5e67890"
 *                     name:
 *                       type: string
 *                       example: "Jane Doe Updated"
 *                     email:
 *                       type: string
 *                       example: "jane.doe@example.com"
 *                     role:
 *                       type: string
 *                       example: "admin"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     pricingGroupId:
 *                       type: string
 *                       format: uuid
 *                       example: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-18T12:34:56.000Z"
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

authRouter.delete("/users/:id", authenticate, AuthController.deleteUser);

/**
 * @swagger
 * /auth/users/{id}:
 *   delete:
 *     summary: Permanently delete a user
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User deleted permanently
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

authRouter.post("/signup-link", authenticate, AuthController.createSignupLink);
/**
 * @swagger
 * /auth/signup-link:
 *   post:
 *     summary: Create a signup link for a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "invitee@example.com"
 *               name:
 *                 type: string
 *                 example: "Invitee User"
 *               pricingGroupId:
 *                 type: string
 *                 format: uuid
 *                 example: "d7b2a920-35af-4d3c-b23c-9f0c4a4126e7"
 *     responses:
 *       201:
 *         description: Signup link created and sent
 *       409:
 *         description: Email already in use
 *       500:
 *         description: Internal server error
 */

authRouter.post("/register-with-link", AuthController.registerWithLink);
/**
 * @swagger
 * /auth/register-with-link:
 *   post:
 *     summary: Register a user using a signup link
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *                 example: "a7fbd09a3d2f4c9ea6be8c..."
 *               password:
 *                 type: string
 *                 example: "StrongPass123!"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Link invalid or expired
 *       404:
 *         description: Link not found
 *       500:
 *         description: Internal server error
 */

authRouter.get("/signup-links", AuthController.getAllSignupLinks);

/**
 * @swagger
 * /auth/signup-links:
 *   get:
 *     summary: Get all signup links
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: List of signup links
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 signupLinks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "64b8f3f6..."
 *                       email:
 *                         type: string
 *                         example: "john@example.com"
 *                       name:
 *                         type: string
 *                         example: "John Doe"
 *                       pricingGroupId:
 *                         type: string
 *                         example: "pg_12345"
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-09-01T12:00:00.000Z"
 *                       isUsed:
 *                         type: boolean
 *                         example: false
 *                 total:
 *                   type: integer
 *                   example: 42
 */

authRouter.get("/signup-links/:token", AuthController.getSignupLinkByToken);

/**
 * @swagger
 * /auth/signup-links/{token}:
 *   get:
 *     summary: Get a signup link by token
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Signup link token
 *     responses:
 *       200:
 *         description: Signup link details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 link:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "64b8f3f6..."
 *                     email:
 *                       type: string
 *                       example: "john@example.com"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     pricingGroupId:
 *                       type: string
 *                       example: "pg_12345"
 *                     token:
 *                       type: string
 *                       example: "abcd1234efgh"
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-01T12:00:00.000Z"
 *                     isUsed:
 *                       type: boolean
 *                       example: false
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 */

export default authRouter;
