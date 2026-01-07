import express from "express";
import { ZohoController } from "../controllers/zoho.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";

const zohoRoutes = express.Router();
const zohoController = new ZohoController();

zohoRoutes.get("/auth", zohoController.authorizeZoho);
zohoRoutes.get("/callback", zohoController.zohoCallback);
zohoRoutes.get(
  "/customers",
  authenticate,
  authorize("admin"),
  zohoController.getZohoCustomers
);

export default zohoRoutes;
