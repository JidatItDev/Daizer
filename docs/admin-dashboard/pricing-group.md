# Pricing Group

## Purpose

Pricing Groups define how product prices are segmented for different user cohorts (for example: reseller, test, special segment).  
This page exists so admin teams can keep commercial rules centralized and enforceable.

It provides the governance layer for:
- creating pricing strategies,
- assigning a default pricing policy,
- updating pricing group metadata,
- and preventing invalid default state transitions.

## What Admin Can Do

- View all pricing groups with pagination.
- Create new pricing groups.
- Edit existing pricing groups.
- Delete pricing groups with business safeguards:
  - blocks deleting the only default group,
  - supports default reassignment flow when deleting current default.
- Toggle which group is the default.
- Confirm default transitions explicitly when multiple groups exist.

## Frontend Implementation

- Main page: `client/src/admin/pricingGroups/index.tsx`
- Shared UI:
  - `client/src/components/common/Table.tsx`
  - `client/src/components/common/Modal.tsx`
  - `client/src/components/common/ConfirmationModal.tsx`

## API Hooks Used (Frontend)

From `client/src/api/pricingGroup.ts`:
- `usePricingGroups()` -> `GET /pricing-groups`
- `useCreatePricingGroup()` -> `POST /pricing-groups`
- `useUpdatePricingGroup()` -> `PUT /pricing-groups/:id`
- `useDeletePricingGroup()` -> `DELETE /pricing-groups/:id`
- `useDefaultPricingGroup()` -> `GET /pricing-groups/default` (supporting hook)
- `useMyPricingGroup()` -> `GET /pricing-groups/me` (user-side related hook)

## Backend Routes and Handlers

Routes defined in `server/src/routes/pricingGroup.routes.ts`:
- `POST /api/v1/pricing-groups/` -> `PricingGroupController.createPricingGroup`
- `GET /api/v1/pricing-groups/` -> `PricingGroupController.getAllPricingGroups`
- `GET /api/v1/pricing-groups/default` -> `PricingGroupController.getDefaultPricingGroup`
- `GET /api/v1/pricing-groups/me` -> `PricingGroupController.getMyPricingGroup`
- `PUT /api/v1/pricing-groups/:id` -> `PricingGroupController.updatePricingGroup`
- `DELETE /api/v1/pricing-groups/:id` -> `PricingGroupController.deletePricingGroup`

Primary backend files:
- `server/src/controllers/pricingGroup.controller.ts`
- `server/src/validators/pricingGroup.schema.ts`

## Data/Schema Touchpoints

- Pricing group table: `server/src/db/schema/pricingGroup.schema.ts`
- User linkage to pricing group: `server/src/db/schema/User.schema.ts`
- Product price mappings by group: `server/src/db/schema/products.schema.ts`

## Why This Page Is Important

This page isolates business pricing policy from product CRUD.  
That separation keeps the system scalable:
- business can evolve group strategies without rewriting products,
- support/admin teams can control default behavior safely,
- and user assignment + checkout pricing remain consistent across the platform.

