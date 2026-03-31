# User Management

## Purpose

The User Management area gives administrators operational control over customer accounts.  
It exists so admins can:
- view user account and wallet context in one place,
- enable/disable accounts quickly,
- update user metadata (such as pricing group assignment),
- inspect user-level purchase behavior,
- and create invite-based signup links for controlled onboarding.

This is a core operations page because all downstream features (wallets, orders, pricing, refunds) depend on valid user lifecycle management.

## What Admin Can Do

- Browse paginated users list.
- Filter users by:
  - active/disabled status,
  - pricing group.
- Sort user list (name ascending/descending).
- Open user detail page for purchase history and wallet snapshot.
- Toggle user active status.
- Edit user information (name, pricing group).
- Manage signup invitation links:
  - create new signup link,
  - view link status (used/pending),
  - copy link,
  - open link in browser.

## Frontend Implementation

- Main page: `client/src/admin/userManagement/index.tsx`
- User detail page: `client/src/admin/userManagement/UserDetails.tsx`
- App routing: `client/src/App.tsx`
- Shared table/ui used by page:
  - `client/src/components/common/Table.tsx`
  - `client/src/components/common/Modal.tsx`
  - `client/src/components/common/ConfirmationModal.tsx`
  - `client/src/components/common/DateFilterPanel.tsx`

## API Hooks Used (Frontend)

From `client/src/api/auth.ts`:
- `useUsers()` -> `GET /auth/users`
- `useUpdateUser()` -> `PUT /auth/users/:id`
- `useDeleteUser()` -> `DELETE /auth/users/:id`
- `useCreateSignupLink()` -> `POST /auth/signup-link`
- `useSignupLinks()` -> `GET /auth/signup-links`
- `useUserDetails()` -> `GET /auth/user/:id` (optional `date` filter)
- `useAllOrders()` (used by order management integrations) -> `GET /auth/orders`

From `client/src/api/pricingGroup.ts`:
- `usePricingGroups()` for pricing group filter/dropdown binding.

## Backend Routes and Handlers

Routes are defined in `server/src/routes/auth.routes.ts`:
- `GET /api/v1/auth/users` -> `AuthController.getAllUsers`
- `PUT /api/v1/auth/users/:id` -> `AuthController.updateUser`
- `DELETE /api/v1/auth/users/:id` -> `AuthController.deleteUser`
- `POST /api/v1/auth/signup-link` -> `AuthController.createSignupLink`
- `GET /api/v1/auth/signup-links` -> `AuthController.getAllSignupLinks`
- `GET /api/v1/auth/signup-links/:token` -> `AuthController.getSignupLinkByToken`
- `GET /api/v1/auth/user/:id` -> `AuthController.getUserByIdWithWalletAndPurchases`
- `GET /api/v1/auth/orders` -> `AuthController.getAllOrders`

Primary controller file:
- `server/src/controllers/auth.controller.ts`

## Data/Schema Touchpoints

Likely storage objects involved in this page flow:
- User: `server/src/db/schema/User.schema.ts`
- Wallet summary shown on details: `server/src/db/schema/wallets.schema.ts`
- Purchase/order history: `server/src/db/schema/transactions.schema.ts`
- Signup links: `server/src/db/schema/signupLinks.schema.ts`
- Pricing mapping on users: `server/src/db/schema/pricingGroup.schema.ts`

## Why This Page Is Important

Without this page, admin teams cannot safely operate the business:
- no controlled onboarding,
- no quick account intervention for abuse/fraud/support,
- no context-based support (wallet + purchase view),
- no way to align users with pricing policy.

It acts as the control center for account governance across the whole platform.

