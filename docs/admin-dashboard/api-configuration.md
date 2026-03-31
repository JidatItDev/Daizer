# API Configuration

## Purpose

The API Configuration page manages external service providers used by the platform for product purchase/sell flows.  
It exists to keep provider credentials and endpoint behavior centrally manageable by admins without code changes.

In practical terms, this page controls the integrations that power service catalogs and real purchase execution.

## What Admin Can Do

- View all configured API providers.
- Add a new provider.
- Edit provider metadata and auth fields.
- Delete provider.
- Toggle provider active state (within provider payload).
- Test a provider connectivity/health from dashboard action.

## Frontend Implementation

- Main page: `client/src/admin/ExternalApiProvider/index.tsx`
- Shared table/modal components:
  - `client/src/components/common/Table.tsx`
  - `client/src/components/common/Modal.tsx`
  - `client/src/components/common/ConfirmationModal.tsx`

## API Hooks Used (Frontend)

From `client/src/api/useExternalProvider.ts`:
- `useApiProviders()` -> `GET /external-providers`
- `useCreateApiProvider()` -> `POST /external-providers`
- `useUpdateApiProvider()` -> `PUT /external-providers/:id`
- `useDeleteApiProvider()` -> `DELETE /external-providers/:id`
- `useTestApiProvider()` -> `POST /external-providers/:id/test`

Related usage in product flow:
- `client/src/api/UseProducts.ts` -> `useProductServices(providerId)` calls `POST /products/getProductServices`, which depends on provider configuration.

## Backend Routes and Handlers

Routes in `server/src/routes/externalProvider.routes.ts`:
- `GET /api/v1/external-providers/` -> `ExternalProviderController.getAll`
- `POST /api/v1/external-providers/` -> `ExternalProviderController.create`
- `PUT /api/v1/external-providers/:id` -> `ExternalProviderController.update`
- `DELETE /api/v1/external-providers/:id` -> `ExternalProviderController.remove`
- `POST /api/v1/external-providers/:id/test` -> `ExternalProviderController.testProvider`

Primary backend logic:
- `server/src/controllers/externalProvider.controller.ts`
- Route mounted in `server/src/index.ts`

## Data/Schema Touchpoints

- Provider persistence: `server/src/db/schema/externalProviders.schema.ts`
- Product to provider linkage: `server/src/db/schema/products.schema.ts`

## Why This Page Is Important

This page decouples integration operations from deployment:
- admins can rotate credentials and manage provider availability quickly,
- support teams can run immediate health checks,
- and product purchase flows remain stable through configurable provider routing.

