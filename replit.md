# Midanic (ميدانيك) — Beauty & Grooming Platform

## Overview

pnpm workspace monorepo. Full-stack bilingual (AR/EN) beauty brand platform: web store + ERP management dashboard + backend API.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (OpenAPI → React hooks + Zod schemas)
- **Frontend**: React 18 + Vite + TailwindCSS v4 + shadcn/ui
- **Charts**: Recharts
- **Build**: esbuild (API server)

## Brand

- Primary navy: `#1B3057` (HSL 219 53% 22%)
- Off-white: `#F5F5F0` (HSL 60 14% 95%)
- Logo: `attached_assets/logo_des_13_midanic_1777739613232.jpeg`
- Bilingual AR/EN throughout all UIs

## Artifacts

| Artifact | Path | Port | Description |
|---|---|---|---|
| `artifacts/api-server` | `/api/` | 8080 | Express REST API + WebSocket |
| `artifacts/web-store` | `/` | 23733 | Customer-facing e-commerce store |
| `artifacts/erp` | `/erp/` | 18996 | Internal ERP management dashboard |

## Key Packages

| Package | Description |
|---|---|
| `lib/api-spec` | OpenAPI spec (`openapi.yaml`) + Orval codegen config |
| `lib/api-zod` | Generated Zod schemas (from `lib/api-spec`) |
| `lib/api-client-react` | Generated React Query hooks (from `lib/api-spec`) |
| `lib/db` | Drizzle schema + DB connection |

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks + Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Auth

- JWT stored in `localStorage` as `midanic_token`
- Admin credentials: `admin@midanic.com` / `admin123`
- ERP and web store both use `setAuthTokenGetter(() => localStorage.getItem("midanic_token"))` from `@workspace/api-client-react`
- JWT secret: `midanic-secret-2024` (move to env var for production)

## API Structure

- `artifacts/api-server/src/routes/` — route handlers
  - `auth.ts` — login, register, /me
  - `products.ts` — CRUD + reviews
  - `cart.ts` — cart management (returns `CartItem[]` array directly)
  - `orders.ts` — orders, admin orders, status update
  - `erp.ts` — employees, attendance, leaves, suppliers, purchase orders, inventory, accounting, CRM
  - `storage.ts` — file upload via object storage
- `artifacts/api-server/src/lib/ws.ts` — WebSocket server at `/ws` path
  - Broadcasts: `new_order`, `low_stock`, `leave_status_changed`, `purchase_received`

## Cart API Note

`useGetCart()` returns `CartItem[]` (array directly, not `{ items: CartItem[] }`). When using cart data:
```ts
const items = cart ?? [];
```

## Products API Note

`useGetProducts()` returns `ProductsResponse` which has shape `{ products: Product[], total: number }` (key is `products`, not `items`).

## Database Seed

- 4 categories, 16 products, 1 admin user, 2 coupons
- Admin: `admin@midanic.com` / `admin123`

## Payment & SMS Integration (Task #4 — COMPLETED)

- **Stripe backend**: `POST /api/payments/create-intent` (PaymentIntent for web), `POST /api/payments/checkout-session` (Checkout Session URL for mobile), `POST /api/payments/webhook` (event handler)
- **Stripe frontend (web)**: Stripe Elements in Checkout page with payment method selector (Cash on Delivery | Pay with Card). Requires `VITE_STRIPE_PUBLISHABLE_KEY` env var.
- **Stripe mobile**: Payment method selector in Expo checkout; "Pay Online" opens a Stripe Checkout Session via `expo-web-browser`. Requires `STRIPE_SECRET_KEY`.
- **SMS**: Twilio integration in `artifacts/api-server/src/lib/sms.ts`. Customer SMS + admin SMS sent fire-and-forget after order creation. Requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
- **Graceful degradation**: All payment/SMS features silently degrade if env vars not set — existing cash-on-delivery flow always works.

## Required Secrets (for payment/SMS features)

| Secret | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe backend (PaymentIntent, webhook) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `TWILIO_ACCOUNT_SID` | Twilio SMS |
| `TWILIO_AUTH_TOKEN` | Twilio SMS |
| `TWILIO_PHONE_NUMBER` | Twilio from-number |

## Env Vars (frontend)

| Var | Purpose |
|---|---|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Web store Stripe Elements |

## Pending Tasks

- ERP Management System
- GitHub integration
