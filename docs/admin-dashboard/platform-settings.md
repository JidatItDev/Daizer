# Platform Settings

## Purpose

Platform Settings centralizes global system configuration required by both admin and user dashboards.  
This page exists so administrators can manage payment credentials, branding, and communication templates from one secure UI.

It directly affects:
- wallet top-up/payment flow (PayPal),
- platform visual identity (logo),
- and transactional communication quality (email templates).

## What Admin Can Do

### 1) PayPal Configuration
- View and edit PayPal Client ID.
- View and edit PayPal Client Secret.
- Switch PayPal mode (`sandbox` or `live`).
- Save config updates without redeploying.

### 2) Branding (Site Logo)
- Preview current logo.
- Upload and replace logo through config update flow.
- Immediately reflect logo in shared layout/sidebar via config context.

### 3) Email Templates
- Browse paginated templates.
- Open template editor modal.
- Update subject/body with rich text editor.
- Save template changes for notification workflows.

## Frontend Implementation

- Main page: `client/src/admin/platformSettings/index.tsx`
- Related context:
  - `client/src/context/ConfigContext.tsx` (consumes platform config)
  - `client/src/components/common/Sidebar.tsx` (logo rendering)
- Rich editor:
  - `react-quill-new` integrated directly in settings page

## API Hooks Used (Frontend)

From `client/src/api/useConfig.ts`:
- `useConfig()` -> `GET /config`
- `useUpdateOrCreateConfig()` -> `POST /config` (multipart payload with optional logo)
- `useEmailTemplate()` -> `GET /config/emailTemplate` (auxiliary hook)

From `client/src/api/useEmailTemplates.ts`:
- `useEmailTemplates()` -> `GET /emailTemplate`
- `useUpdateEmailTemplate()` -> `PUT /emailTemplate/:id`
- (available but not primary on this page: create/delete/by-id/by-type hooks)

## Backend Routes and Handlers

Config routes in `server/src/routes/config.routes.ts`:
- `POST /api/v1/config/` -> `ConfigController.updateOrCreateConfig`
- `GET /api/v1/config/` -> `ConfigController.getConfig`
- `GET /api/v1/config/emailTemplate` -> `ConfigController.getEmailTemplate`

Email template routes in `server/src/routes/emailTemplate.routes.ts`:
- `GET /api/v1/emailTemplate/` -> `EmailTemplateController.getAllEmailTemplates`
- `PUT /api/v1/emailTemplate/:id` -> `EmailTemplateController.createOrEditTemplate`
- plus create/delete/read variants for full template lifecycle.

Primary backend files:
- `server/src/controllers/config.controller.ts`
- `server/src/controllers/emailTemplate.controller.ts`
- `server/src/validators/config.schema.ts`
- `server/src/validators/emailTemplate.schema.ts`

## Data/Schema Touchpoints

- Global config persistence: `server/src/db/schema/config.schema.ts`
- Email templates: `server/src/db/schema/emailTemplate.schema.ts`
- PayPal server config helpers: `server/src/config/paypal.ts`

## Why This Page Is Important

This page controls production-critical platform behavior:
- incorrect payment credentials can block wallet top-ups,
- outdated branding impacts trust and UI consistency,
- poor email template quality hurts onboarding, password reset, and support workflows.

Centralizing all these settings reduces operational risk and speeds admin response time.

