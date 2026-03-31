# Daizer Documentation

Welcome to the official technical documentation for the **Daizer** platform.

Daizer is a dual-dashboard web system:
- **Admin Dashboard** for operations, configuration, financial controls, and catalog management.
- **User Dashboard** for wallet usage, product discovery, purchasing, and order tracking.

## What This Documentation Covers

- Product and feature behavior per dashboard page
- Frontend implementation references
- API integration references
- Backend route/controller references
- Data model touchpoints

## Open Dashboard Docs

- [Go to Admin Dashboard Documentation](./admin-dashboard/README.md)
- [Go to User Dashboard Documentation](./user-dashboard/README.md)

## Run Docs UI Locally

From the `docs` folder:

```bash
pnpm install
pnpm docs:dev
```

Build static documentation:

```bash
pnpm docs:build
pnpm docs:preview
```

This launches a live documentation UI in your browser (local dev and preview modes).

