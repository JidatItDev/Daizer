import { Router } from "express";
import WalletController from "../controllers/wallet.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";

const walletRouter = Router();

// ===================
// User Wallet Routes
// ===================
walletRouter.get("/balance", authenticate, WalletController.getBalance);

walletRouter.get(
  "/transactions",
  authenticate,
  WalletController.getTransactions
);

walletRouter.post(
  "/refund-request",
  authenticate,
  WalletController.requestRefund
);
walletRouter.get(
  "/refunds",
  authenticate,
  WalletController.getUserRefundRequests
);

// ===================
// PayPal Top-up Routes
// ===================
walletRouter.post(
  "/paypal/create-order",
  authenticate,
  WalletController.createPayPalOrder
);

walletRouter.post(
  "/paypal/capture-order",
  authenticate,
  WalletController.capturePayPalOrder
);

// Webhooks should not require auth (PayPal calls these)
walletRouter.post("/paypal/webhook", WalletController.handlePayPalWebhook);

// ===================
// Admin Wallet Routes
// ===================
walletRouter.get(
  "/admin/wallets",
  authenticate,
  authorize("superadmin", "admin"),
  WalletController.getAllWallets
);

walletRouter.get(
  "/admin/transactions",
  authenticate,
  authorize("superadmin", "admin"),
  WalletController.getAllTransactions
);

walletRouter.get(
  "/admin/refunds",
  authenticate,
  authorize("superadmin", "admin"),
  WalletController.getRefundRequests
);

walletRouter.post(
  "/admin/refunds/:refundId/approve",
  authenticate,
  authorize("superadmin", "admin"),
  WalletController.approveRefund
);

walletRouter.post(
  "/admin/refunds/:refundId/reject",
  authenticate,
  authorize("superadmin", "admin"),
  WalletController.rejectRefund
);

walletRouter.post(
  "/admin/adjust",
  authenticate,
  authorize("superadmin", "admin"),
  WalletController.adjustWallet
);

export default walletRouter;
