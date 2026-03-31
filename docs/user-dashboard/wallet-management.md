# Wallet Management

## Purpose

Wallet Management is the user’s financial control page.  
It exists so users can manage their stored balance, review all money movement, and initiate refund requests without contacting support for every action.

This page is critical for trust and transparency because users can always verify:
- current balance,
- top-up history,
- purchase deductions,
- refund lifecycle,
- and admin credit/debit adjustments.

## What User Can Do

### 1) View Wallet Balance
- See current balance and wallet currency.

### 2) Top Up Wallet
- Start PayPal top-up flow from wallet screen.
- Select predefined amount or enter custom amount.
- Redirect to PayPal approval URL.
- Return and complete capture flow automatically.

### 3) Request Partial Refund
- Open partial refund modal.
- Enter refund amount (bounded by available balance).
- Submit refund request.
- Track request in refund table.

### 4) Inspect Wallet Activity

Tabs shown in wallet page:
- `Topup` transactions
- `Purchase` transactions
- `Refund` requests/status
- `Credit/Debit` adjustments

The page supports infinite scrolling for top-up/purchase items and structured table views for refunds and adjustments.

## Frontend Implementation

- Main wallet page: `client/src/user/wallet/index.tsx`
- PayPal top-up page: `client/src/user/wallet/Topup.tsx`
- Refund request modal: `client/src/components/user/wallet/PartialRefundModal.tsx`
- Route and layout integration:
  - `client/src/App.tsx`
  - `client/src/user/UserLayout.tsx`

## API Hooks Used (Frontend)

From `client/src/api/Wallets.ts`:
- `useWalletBalance()` -> `GET /wallet/balance`
- `useWalletTransactions()` -> `GET /wallet/transactions`
- `useUserRefundRequests()` -> `GET /wallet/refunds`
- `useRequestRefund()` -> `POST /wallet/refund-request`
- `useCreatePayPalOrder()` -> `POST /wallet/paypal/create-order`
- `useCapturePayPalOrder()` -> `POST /wallet/paypal/capture-order`

These hooks also invalidate/refetch wallet-related query keys to keep balances and histories consistent after mutations.

## Backend Routes and Handlers

User wallet routes are defined in `server/src/routes/wallet.routes.ts`:
- `GET /api/v1/wallet/balance` -> `WalletController.getBalance`
- `GET /api/v1/wallet/transactions` -> `WalletController.getTransactions`
- `POST /api/v1/wallet/refund-request` -> `WalletController.requestRefund`
- `GET /api/v1/wallet/refunds` -> `WalletController.getUserRefundRequests`
- `POST /api/v1/wallet/paypal/create-order` -> `WalletController.createPayPalOrder`
- `POST /api/v1/wallet/paypal/capture-order` -> `WalletController.capturePayPalOrder`
- `POST /api/v1/wallet/paypal/webhook` -> `WalletController.handlePayPalWebhook`

Primary controller file:
- `server/src/controllers/wallet.controller.ts`

## Data/Schema Touchpoints

- Wallet balance: `server/src/db/schema/wallets.schema.ts`
- Transaction ledger: `server/src/db/schema/transactions.schema.ts`
- Refund requests: `server/src/db/schema/refundRequests.schema.ts`
- User linkage: `server/src/db/schema/User.schema.ts`

PayPal integration helpers:
- `server/src/config/paypal.ts`
- related wallet controller logic for order creation/capture/webhook.

## Why This Page Is Important

This page is the user’s financial source of truth:
- reduces support overhead by self-service transparency,
- gives users confidence in payment and refund flow,
- and ensures wallet-based purchasing remains understandable and auditable.

