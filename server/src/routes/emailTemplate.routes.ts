import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import EmailTemplateController from "../controllers/emailTemplate.controller";
import { validateSchema } from "../middlewares/zod.middleware";
import {
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
} from "../validators/emailTemplate.schema";

const emailTemplateRouter = Router();

emailTemplateRouter.post(
  "/",
  authenticate,
  validateSchema(createEmailTemplateSchema),
  EmailTemplateController.createOrEditTemplate
);

emailTemplateRouter.put(
  "/:id",
  authenticate,
  validateSchema(updateEmailTemplateSchema),
  EmailTemplateController.createOrEditTemplate
);

emailTemplateRouter.get(
  "/",
  authenticate,
  EmailTemplateController.getAllEmailTemplates
);

emailTemplateRouter.get(
  "/id/:id",
  authenticate,
  EmailTemplateController.getTemplate
);

emailTemplateRouter.get(
  "/type/:type",
  authenticate,
  EmailTemplateController.getTemplate
);

emailTemplateRouter.delete(
  "/:id",
  authenticate,
  EmailTemplateController.deleteTemplate
);

export default emailTemplateRouter;
