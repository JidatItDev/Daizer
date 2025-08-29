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

const CategoryRoutes = Router();

// Create
CategoryRoutes.post(
  "/createParentCategory",
  authenticate,
  authorize("admin"),
  validateSchema(createParentCategorySchema),
  CategoryController.createParentCategory
);

CategoryRoutes.post(
  "/createSubCategory",
  authenticate,
  authorize("admin"),
  validateSchema(createSubcategorySchema),
  CategoryController.createSubcategory
);

// Update
CategoryRoutes.put(
  "/updateCategory/:id",
  authenticate,
  authorize("admin"),
  validateSchema(updateCategorySchema),
  CategoryController.updateCategory
);

// Delete
CategoryRoutes.delete(
  "/deleteCategory/:id",
  authenticate,
  authorize("admin"),
  validateSchema(idParamSchema),
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
