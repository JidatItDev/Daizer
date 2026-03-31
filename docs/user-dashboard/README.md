# User Dashboard Documentation

This folder contains technical documentation for the `Daizer` user dashboard.

The goal is to explain user-facing operations end-to-end:
- wallet operations and transaction visibility,
- catalog browsing and purchase flow,
- and order history tracking.

## User Pages

1. `wallet-management.md`
2. `product-browsing.md`

## High-Level Entry Points

- Frontend route registration: `client/src/App.tsx`
- User layout and sidebar menu: `client/src/user/UserLayout.tsx`
- Backend API mounting: `server/src/index.ts`

## User Route Map (Frontend)

- `/dashboard` -> Wallet Management
- `/topup` -> Wallet Top-Up (PayPal redirect flow)
- `/browse-categories` -> Product Browsing (categories)
- `/browse-categories/:id` -> Subcategories
- `/products/:id` -> Product list by subcategory/category
- `/checkout/:id` -> Purchase checkout
- `/myOrders` -> User order history

