import { Router } from "express";

import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validateSchema } from "../middlewares/zod.middleware";
import {
  createParentCategorySchema,
  createSubcategorySchema,
  updateCategorySchema,
  listParentsSchema,
  listSubcategoriesSchema,
  getSubcategoriesOfCategorySchema,
  listCategoriesTreeSchema,
  idParamSchema,
  pagedQuerySchema,
} from "../validators/category.schema";
import CategoryController from "../controllers/categories.controller";
import { documentUpload } from "../middlewares/multerS3upload.middleware";
import express from "express";
import { multiPartValidateSchema } from "../middlewares/ZodMultipartMiddleware";
const CategoryRoutes = Router();

// Create
CategoryRoutes.post(
  "/createParentCategory",
  authenticate,
  authorize("admin"),
  documentUpload.upload.single("image"), // Add multer middleware BEFORE validation
  validateSchema(createParentCategorySchema),
  CategoryController.createParentCategory as unknown as express.RequestHandler
);

CategoryRoutes.post(
  "/createSubCategory",
  authenticate,
  authorize("admin"),
  documentUpload.upload.single("image"), // Add multer middleware BEFORE validation
  validateSchema(createSubcategorySchema),
  CategoryController.createSubcategory as unknown as express.RequestHandler
);

// Update
CategoryRoutes.put(
  "/updateCategory/:id",
  authenticate,
  authorize("admin"),
  documentUpload.upload.single("image"), // Add multer middleware BEFORE validation
  multiPartValidateSchema(updateCategorySchema),
  CategoryController.updateCategory as unknown as express.RequestHandler
);

// Delete
CategoryRoutes.delete(
  "/deleteCategory/:id",
  authenticate,
  authorize("admin"),
  CategoryController.deleteCategory
);

// Fetch lists
CategoryRoutes.get("/getAllCategories", CategoryController.getAllCategories);

CategoryRoutes.get(
  "/getAllParentCategories",
  CategoryController.getParentCategories
);

CategoryRoutes.get(
  "/getAllSubCategories",
  CategoryController.getAllSubcategories
);

CategoryRoutes.get(
  "/getSpecific_Subcategories_Of_Category/:id",
  CategoryController.getSubcategoriesOfCategory
);

// Tree (parents with subcategories[] nested)
CategoryRoutes.get("/ListAllCategories", CategoryController.getCategoriesTree);

export default CategoryRoutes;
