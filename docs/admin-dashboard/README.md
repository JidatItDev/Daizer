# Admin Dashboard Documentation

This folder contains technical documentation for the `Daizer` admin dashboard.

Each page has its own dedicated markdown file so product owners, developers, and QA can understand:
- why the page exists,
- what business workflow it supports,
- what admin actions are available,
- which frontend files implement it,
- which API endpoints it uses,
- and which backend routes/controllers handle those requests.

## Admin Pages

1. `user-management.md`
2. `pricing-group.md`
3. `wallet-management.md`
4. `orders-products.md`
5. `api-configuration.md`
6. `platform-settings.md`

## High-Level Entry Points

- Frontend route registration: `client/src/App.tsx`
- Admin layout and sidebar: `client/src/admin/AdminLayout.tsx`
- Shared sidebar rendering: `client/src/components/common/Sidebar.tsx`
- Backend API base mount: `server/src/index.ts`

## Admin Route Map (Frontend)

- `/admin/dashboard` -> User Management
- `/admin/user/:id` -> User Details
- `/admin/pricing-groups` -> Pricing Group
- `/admin/wallet` -> Wallet Management
- `/admin/orders-products` -> Orders & Products
- `/admin/external-api` -> API Configuration
- `/admin/settings` -> Platform Settings

Defined in `client/src/App.tsx` and surfaced from `client/src/admin/AdminLayout.tsx`.

