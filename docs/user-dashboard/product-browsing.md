# Product Browsing

## Purpose

Product Browsing allows users to discover available products, view category hierarchy, purchase items using wallet balance, and track their own orders.  
It exists to provide an end-to-end commerce journey inside the user dashboard:
- browse -> select -> checkout -> order history.

## User Journey and Capabilities

### 1) Browse Categories
- User opens product browsing page.
- Parent categories are loaded and displayed as cards.
- Infinite scrolling loads additional categories.
- User can jump to `My Orders` from the same page.

### 2) Browse Subcategories
- User selects a parent category.
- Subcategories are displayed for that category.
- User navigates deeper into product listing.

### 3) View Products
- Products are listed for selected category/subcategory context.
- Card displays image, name, quantity, and applicable price.
- Price resolution logic:
  - user pricing group first,
  - fallback to default pricing group.
- Product is marked unavailable if no applicable price exists.

### 4) Checkout and Purchase
- User opens checkout for a product.
- Enters required player/game ID.
- Sees subtotal and total.
- Purchase is completed using wallet balance via purchase API.
- If balance is insufficient, user is prompted to top up wallet.

### 5) My Orders
- User can open orders page and view own purchase records.
- Supports sorting and date filtering.
- Includes status and amount per order.

## Frontend Implementation

- Categories page: `client/src/user/categories/index.tsx`
- Subcategories page: `client/src/user/categories/Subcategory.tsx`
- Product listing page: `client/src/user/products/index.tsx`
- Checkout page: `client/src/user/products/Checkout.tsx`
- My orders page: `client/src/user/myOrders/index.tsx`
- Layout/route wiring:
  - `client/src/user/UserLayout.tsx`
  - `client/src/App.tsx`

## API Hooks Used (Frontend)

From `client/src/api/UseCategories.ts`:
- `useParentCategories()` -> `GET /categories/getAllParentCategories`
- `useSubcategoriesOfCategory()` -> `GET /categories/getSpecific_Subcategories_Of_Category/:id`

From `client/src/api/UseProducts.ts`:
- `useProductsByCategory()` -> `GET /products/getProductsByCategory/:categoryId`
- `useProduct()` -> `GET /products/getProductById/:id`
- `usePurchaseProduct()` -> `POST /products/:productId/purchase`

From `client/src/api/pricingGroup.ts`:
- `useMyPricingGroup()` -> `GET /pricing-groups/me`
- `useDefaultPricingGroup()` -> `GET /pricing-groups/default`

From `client/src/api/Wallets.ts`:
- `useWalletBalance()` used on checkout for purchase eligibility checks.

From `client/src/api/auth.ts`:
- `useMyOrders()` -> `GET /auth/myOrders`

## Backend Routes and Handlers

Category routes in `server/src/routes/category.routes.ts`:
- `GET /api/v1/categories/getAllParentCategories`
- `GET /api/v1/categories/getSpecific_Subcategories_Of_Category/:id`

Product routes in `server/src/routes/product.routes.ts`:
- `GET /api/v1/products/getProductsByCategory/:categoryId`
- `GET /api/v1/products/getProductById/:id`
- `POST /api/v1/products/:productId/purchase`

Pricing-group routes in `server/src/routes/pricingGroup.routes.ts`:
- `GET /api/v1/pricing-groups/me`
- `GET /api/v1/pricing-groups/default`

Order-history route in `server/src/routes/auth.routes.ts`:
- `GET /api/v1/auth/myOrders`

Primary controllers:
- `server/src/controllers/categories.controller.ts`
- `server/src/controllers/product.controller.ts`
- `server/src/controllers/pricingGroup.controller.ts`
- `server/src/controllers/auth.controller.ts`

## Data/Schema Touchpoints

- Categories/subcategories: `server/src/db/schema/categories.schema.ts`
- Products and product pricing mapping: `server/src/db/schema/products.schema.ts`
- Pricing groups: `server/src/db/schema/pricingGroup.schema.ts`
- Orders/transactions history: `server/src/db/schema/transactions.schema.ts`
- User profile/pricing linkage: `server/src/db/schema/User.schema.ts`

## Why This Module Is Important

This module drives the platform’s core user value:
- discover products quickly,
- buy with transparent pricing,
- use wallet seamlessly,
- and track order outcomes confidently.

It connects catalog management (admin-side) with real user conversion and fulfillment visibility.

