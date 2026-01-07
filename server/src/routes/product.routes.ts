import { Router } from "express";

import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validateSchema } from "../middlewares/zod.middleware";
import {
  createProductSchema,
  updateProductSchema,
  getProductSchema,
  deleteProductSchema,
  getProductByCategorySchema,
} from "../validators/product.schema";
import ProductController from "../controllers/product.controller";
import { documentUpload } from "../middlewares/multerS3upload.middleware";
import { multiPartValidateSchema } from "../middlewares/ZodMultipartMiddleware";

const productRouter = Router();

// Create product (admin only)
productRouter.post(
  "/createProduct",
  authenticate,
  authorize("admin"),
  documentUpload.upload.single("image"), // Add multer middleware BEFORE validation
  multiPartValidateSchema(createProductSchema),
  ProductController.createProduct
);

// Get all products
productRouter.get(
  "/getAllProducts",
  authenticate,
  authorize("admin"),
  ProductController.getAllProducts
);

// Get product by ID
productRouter.get(
  "/getProduct/:id",
  authenticate,
  validateSchema(getProductSchema),
  ProductController.getProductById
);

// Update product
productRouter.put(
  "/updateProduct/:id",
  authenticate,
  authorize("admin"),
  documentUpload.upload.single("image"), // Add multer middleware BEFORE validation
  multiPartValidateSchema(updateProductSchema),
  ProductController.updateProduct
);

// Delete product
productRouter.delete(
  "/deleteProduct/:id",
  authenticate,
  authorize("admin"),
  ProductController.deleteProduct
);

productRouter.post(
  "/:productId/purchase",
  authenticate,
  ProductController.purchaseProduct
);
// getProductsByCategory
productRouter.get(
  "/getProductsByCategory/:categoryId",
  ProductController.getProductsByCategory
);

// getPricingGroups
productRouter.get(
  "/getPricingGroups",
  authenticate,
  authorize("admin"),
  ProductController.getPricingGroups
);

// getProductById/:id
productRouter.get("/getProductById/:id", ProductController.getProductById);

productRouter.post(
  "/getProductServices",
  authenticate,
  authorize("admin"),
  ProductController.getProductServices
);

export default productRouter;
