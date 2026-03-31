# Wallet Management

## Purpose

Wallet Management is the financial operations panel for admin teams.  
It is designed to centralize wallet control, transaction visibility, and refund governance in one workflow.

This page supports three operational tabs:
- Wallets,
- Transactions,
- Partial Refunds.

## What Admin Can Do

### 1) Wallets Tab
- View user wallets (name, email, balance, pricing group).
- Open wallet adjustment flow.
- Credit or debit a user wallet manually (admin intervention flow).

### 2) Transactions Tab
- Inspect all transactions across wallet activity.
- Review transaction type, amount, date, and metadata-derived financial fields.
- Trigger wallet edit from transaction context.

### 3) Partial Refunds Tab
- Review refund requests submitted by users.
- Approve refund (with destination and sent-by accounting metadata).
- Reject refund requests.
- Track refund statuses (pending/approved/rejected).

## Frontend Implementation

- Main page: `client/src/admin/WalletManagement/index.tsx`
- Related modals/components:
  - `client/src/components/admin/Wallet/AdjustmentTypeModal.tsx`
  - `client/src/components/admin/Wallet/CreditDebitModal.tsx`
  - `client/src/components/admin/Wallet/RefundActionDropdown.tsx`
  - `client/src/components/admin/Wallet/RefundApproveModal.tsx`

## API Hooks Used (Frontend)

From `client/src/api/Wallets.ts`:
- `useAllWallets()` -> `GET /wallet/admin/wallets`
- `useAllTransactions()` -> `GET /wallet/admin/transactions`
- `useRefundRequests()` -> `GET /wallet/admin/refunds`
- `useApproveRefund()` -> `POST /wallet/admin/refunds/:refundId/approve`
- `useRejectRefund()` -> `POST /wallet/admin/refunds/:refundId/reject`
- `useAdjustWallet()` -> `POST /wallet/admin/adjust`
- `useGetActiveAccounts()` -> `GET /wallet/active`
- `useManualOrderTransactions()` -> `GET /wallet/admin/transactions/manual`
- `useUpdateTransactionStatus()` -> `PATCH /wallet/admin/transactions/:transactionId/status`

## Backend Routes and Handlers

Routes defined in `server/src/routes/wallet.routes.ts`:
- `GET /api/v1/wallet/admin/wallets` -> `WalletController.getAllWallets`
- `GET /api/v1/wallet/admin/transactions` -> `WalletController.getAllTransactions`
- `GET /api/v1/wallet/admin/refunds` -> `WalletController.getRefundRequests`
- `POST /api/v1/wallet/admin/refunds/:refundId/approve` -> `WalletController.approveRefund`
- `POST /api/v1/wallet/admin/refunds/:refundId/reject` -> `WalletController.rejectRefund`
- `POST /api/v1/wallet/admin/adjust` -> `WalletController.adjustWallet`
- `GET /api/v1/wallet/admin/transactions/manual` -> `WalletController.getManualOrderTransactions`
- `PATCH /api/v1/wallet/admin/transactions/:transactionId/status` -> `WalletController.updateTransactionStatus`
- `GET /api/v1/wallet/active` -> `WalletController.getActiveAccountsHandler`

Primary backend logic:
- `server/src/controllers/wallet.controller.ts`

## Data/Schema Touchpoints

- Wallets: `server/src/db/schema/wallets.schema.ts`
- Transactions ledger: `server/src/db/schema/transactions.schema.ts`
- Refund queue/state: `server/src/db/schema/refundRequests.schema.ts`
- User mapping: `server/src/db/schema/User.schema.ts`

## Why This Page Is Important

This page is essential for financial control and support SLAs:
- rapid correction of balance errors,
- transparent transaction audit trail,
- standardized refund handling,
- and admin-level rescue path for exceptional payment/order states.

