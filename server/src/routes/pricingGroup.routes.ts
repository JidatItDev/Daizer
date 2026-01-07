import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import PricingGroupController from "../controllers/pricingGroup.controller";
import { validateSchema } from "../middlewares/zod.middleware";
import {
  createPricingGroupSchema,
  updatePricingGroupSchema,
} from "../validators/pricingGroup.schema";

const pricingGroupRouter = Router();

pricingGroupRouter.post(
  "/",
  authenticate,
  authorize("admin"),
  validateSchema(createPricingGroupSchema),
  PricingGroupController.createPricingGroup
);

/**
 * @swagger
 * /pricing-group/create:
 *   post:
 *     summary: Create a new pricing group
 *     tags: [PricingGroup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePricingGroup'
 *     responses:
 *       201:
 *         description: Pricing group created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */

// ✅ Get All Pricing Groups
pricingGroupRouter.get(
  "/",
  authenticate,
  authorize("admin"),
  PricingGroupController.getAllPricingGroups
);
pricingGroupRouter.get(
  "/default",
  authenticate,
  PricingGroupController.getDefaultPricingGroup
);
pricingGroupRouter.get(
  "/me",
  authenticate,
  PricingGroupController.getMyPricingGroup
);

/**
 * @swagger
 * /pricing-group:
 *   get:
 *     summary: Get all pricing groups
 *     tags: [PricingGroup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pricing groups
 *       500:
 *         description: Internal server error
 */

pricingGroupRouter.put(
  "/:id",
  authenticate,
  authorize("admin"),
  validateSchema(updatePricingGroupSchema),
  PricingGroupController.updatePricingGroup
);

/**
 * @swagger
 * /pricing-group/{id}:
 *   put:
 *     summary: Update a pricing group
 *     tags: [PricingGroup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Pricing group ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePricingGroup'
 *     responses:
 *       200:
 *         description: Pricing group updated successfully
 *       404:
 *         description: Pricing group not found
 *       500:
 *         description: Internal server error
 */

pricingGroupRouter.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  PricingGroupController.deletePricingGroup
);

/**
 * @swagger
 * /pricing-group/{id}:
 *   delete:
 *     summary: Delete a pricing group
 *     tags: [PricingGroup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Pricing group ID
 *     responses:
 *       200:
 *         description: Pricing group deleted successfully
 *       404:
 *         description: Pricing group not found
 *       500:
 *         description: Internal server error
 */

export default pricingGroupRouter;
