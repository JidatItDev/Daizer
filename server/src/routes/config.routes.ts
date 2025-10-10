import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import ConfigController from "../controllers/config.controller";
import { validateSchema } from "../middlewares/zod.middleware";
import { updateOrCreateConfigSchema } from "../validators/config.schema";
import { documentUpload } from "../middlewares/multerS3upload.middleware";
import { multiPartValidateSchema } from "../middlewares/ZodMultipartMiddleware";

const configRouter = Router();

// Create or Update config (admin only)
configRouter.post(
  "/",
  authenticate,
  authorize("admin"),
  documentUpload.upload.single("logo"), // for logo upload
  multiPartValidateSchema(updateOrCreateConfigSchema),
  ConfigController.updateOrCreateConfig
);

// Get full config
configRouter.get("/", ConfigController.getConfig);

// Get only email template
configRouter.get(
  "/emailTemplate",
  authenticate,
  ConfigController.getEmailTemplate
);

export default configRouter;
