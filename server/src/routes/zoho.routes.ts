import express from "express";
import { ZohoController } from "../controllers/zoho.controller";

const zohoRoutes = express.Router();
const zohoController = new ZohoController();

zohoRoutes.get("/auth", zohoController.authorizeZoho);
zohoRoutes.get("/callback", zohoController.zohoCallback);
zohoRoutes.get("/customers", zohoController.getZohoCustomers);

export default zohoRoutes;
