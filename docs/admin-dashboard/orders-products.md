# Orders & Products

## Purpose

This page combines catalog operations and order operations in one admin workspace.  
It exists so the team can manage the complete product lifecycle and monitor fulfillment outcomes from a single dashboard section.

The module includes:
- Product Management,
- Order Management,
- Manual Orders.

It also provides category/subcategory management through a dedicated modal.

## What Admin Can Do

### 1) Product Management Tab
- List products with image, category path, price range, creation date, and status.
- Create product (including service binding and pricing-group prices).
- Edit product.
- Delete product.
- Enable/disable product availability.
- View product details in modal.
- Launch category management modal.

### 2) Order Management Tab
- View all orders across users.
- Filter orders by date range.
- Sort by date/price/status.
- Jump to related user details from each order.

### 3) Manual Orders Tab
- See unresolved/manual transactions.
- Complete pending manual orders via status update action.
- Track pending queue with badge count.

## Frontend Implementation

- Main page/tabs: `client/src/admin/order&Product/index.tsx`
- Order management subpage: `client/src/admin/order&Product/OrderManagement.tsx`
- Product modals and category tools:
  - `client/src/components/admin/orders&Products/CreateProductModal.tsx`
  - `client/src/components/admin/orders&Products/EditProductModal.tsx`
  - `client/src/components/admin/orders&Products/ProductDetailModal.tsx`
  - `client/src/components/admin/orders&Products/CategoryManagementModal.tsx`
  - `client/src/components/admin/orders&Products/CategoryAccordion.tsx`

## API Hooks Used (Frontend)

From `client/src/api/UseProducts.ts`:
- `useProducts()` -> `GET /products/getAllProducts`
- `useCreateProduct()` -> `POST /products/createProduct`
- `useUpdateProduct()` -> `PUT /products/updateProduct/:id`
- `useDeleteProduct()` -> `DELETE /products/deleteProduct/:id`
- `useProductServices(providerId)` -> `POST /products/getProductServices`
- `usePricingGroups()` -> `GET /products/getPricingGroups`

From `client/src/api/UseCategories.ts` (category modal):
- `useCategoriesTree()` -> `GET /categories/ListAllCategories`
- `useCreateParentCategory()` -> `POST /categories/createParentCategory`
- `useCreateSubcategory()` -> `POST /categories/createSubCategory`
- `useUpdateCategory()` -> `PUT /categories/updateCategory/:id`
- `useDeleteCategory()` -> `DELETE /categories/deleteCategory/:id`

From `client/src/api/auth.ts`:
- `useAllOrders()` -> `GET /auth/orders` (Order Management tab)

From `client/src/api/Wallets.ts`:
- `useManualOrderTransactions()` -> `GET /wallet/admin/transactions/manual`
- `useUpdateTransactionStatus()` -> `PATCH /wallet/admin/transactions/:transactionId/status`

## Backend Routes and Handlers

Product routes in `server/src/routes/product.routes.ts`:
- `POST /api/v1/products/createProduct` -> `ProductController.createProduct`
- `GET /api/v1/products/getAllProducts` -> `ProductController.getAllProducts`
- `PUT /api/v1/products/updateProduct/:id` -> `ProductController.updateProduct`
- `DELETE /api/v1/products/deleteProduct/:id` -> `ProductController.deleteProduct`
- `GET /api/v1/products/getPricingGroups` -> `ProductController.getPricingGroups`
- `POST /api/v1/products/getProductServices` -> `ProductController.getProductServices`
- `POST /api/v1/products/:productId/purchase` -> `ProductController.purchaseProduct` (user-side checkout integration)

Category routes in `server/src/routes/category.routes.ts`:
- `POST /api/v1/categories/createParentCategory`
- `POST /api/v1/categories/createSubCategory`
- `PUT /api/v1/categories/updateCategory/:id`
- `DELETE /api/v1/categories/deleteCategory/:id`
- `GET /api/v1/categories/ListAllCategories`

Order/manual operations:
- `GET /api/v1/auth/orders` from `server/src/routes/auth.routes.ts`
- Manual order routes from `server/src/routes/wallet.routes.ts`:
  - `GET /api/v1/wallet/admin/transactions/manual`
  - `PATCH /api/v1/wallet/admin/transactions/:transactionId/status`

Primary controllers:
- `server/src/controllers/product.controller.ts`
- `server/src/controllers/categories.controller.ts`
- `server/src/controllers/auth.controller.ts`
- `server/src/controllers/wallet.controller.ts`

## Data/Schema Touchpoints

- Products: `server/src/db/schema/products.schema.ts`
- Categories/subcategories: `server/src/db/schema/categories.schema.ts`
- Pricing group pricing: `server/src/db/schema/pricingGroup.schema.ts`
- Orders/transaction records: `server/src/db/schema/transactions.schema.ts`

## Why This Page Is Important

This module is the commercial backbone:
- product availability and pricing are controlled here,
- category structure drives discoverability,
- order monitoring protects fulfillment quality,
- and manual completion flow resolves external-provider or edge-case failures.

