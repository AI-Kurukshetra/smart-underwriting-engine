# Smart Underwriting Engine

An AI-powered underwriting and risk intelligence platform focused on personal-loan underwriting. It combines application intake, document processing, deterministic risk scoring, automated decision workflows, auditability, and portfolio visibility into a single operational cockpit built with Next.js and Supabase.

The current build is an MVP scaffold with a working UI, mock-backed APIs, and initial Supabase schema + helpers. Several modules are implemented end-to-end, while others are visible in the UI but still rely on placeholder logic or mock data.

## What It Does
- Captures loan applications and routes them into an underwriting queue.
- Collects and stores supporting documents, then extracts structured data.
- Scores applications deterministically with reason codes.
- Produces approve, review, or reject decisions via workflow rules.
- Records audit events and exposes explainability narratives.
- Runs compliance checks and aggregates portfolio metrics.

## Capability Status
Implemented
- Real-time deterministic risk scoring with reason codes.
- Automated decision workflows and underwriting queues.
- Document upload and OCR/extraction pipeline.
- Audit trail creation for major actions.
- Compliance checks and portfolio metrics dashboards.
- Multi-tenant, role-aware access patterns.
- Versioned API surface under `/api/v1`.

Partial
- Risk model registry UI and champion/challenger placeholders.
- Monitoring dashboard without alerting backend.
- Reporting UI without a full report builder.
- API endpoints that return mock data until full persistence is wired.

Planned
- Claims fraud detection and geospatial risk analysis.
- Stress testing, scenario modeling, and batch processing.
- Configurable risk factor weighting UI.
- Third-party data marketplace and vendor connectors.
- Advanced model governance and experimentation.

## Key Modules
- Applications intake and review workflows.
- Document management and extraction.
- Explainability and audit trail views.
- Compliance and portfolio analytics.
- Monitoring, reporting, and model registry.

## API Surface (v1)
Routes are defined in `app/api/v1` and are designed to be API-first. Path patterns include:
- `/api/v1/applications`
- `/api/v1/applications/:id`
- `/api/v1/applications/:id/action`
- `/api/v1/applications/:id/decision`
- `/api/v1/applications/:id/score`
- `/api/v1/applications/:id/explanation`
- `/api/v1/applications/:id/documents`
- `/api/v1/applications/:id/documents/:docId/view`
- `/api/v1/compliance/checks`
- `/api/v1/portfolio/metrics`
- `/api/v1/explainability`
- `/api/v1/risk-assessment`
- `/api/v1/risk-factors`
- `/api/v1/reports`
- `/api/v1/notifications`
- `/api/v1/settings`
- `/api/v1/fraud`

## Architecture
- Next.js App Router UI and server routes.
- Supabase for Postgres, Auth, Storage, and Row Level Security.
- Deterministic scoring and workflow engines in `lib/`.
- Supabase helpers for browser, server, and admin contexts.
- A protected app shell guarded via `proxy.ts`.

## Getting Started
Prerequisites
- Node.js 20+
- A Supabase project

Setup
1. Install dependencies.

```bash
npm install
```

2. Create a local env file.

```bash
cp .env.example .env.local
```

3. Fill in the environment variables listed below.

4. Start the dev server.

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables
Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OCR_PROVIDER_API_KEY`
- `OPENAI_API_KEY` if explanation generation is enabled
- `NEXT_PUBLIC_APP_URL`

## Scripts
- `npm run dev` starts the dev server.
- `npm run build` builds for production.
- `npm run start` serves the production build.
- `npm run lint` runs ESLint.
- `npm run test` runs Vitest.

## Database and Supabase
- SQL migrations live in `supabase/migrations`.
- Supabase Storage is used for document handling.
- Row Level Security is expected to be enabled for tenant isolation.

## Repository Structure
- `app/` Next.js App Router pages and routes.
- `app/api/` versioned API routes.
- `components/` UI and feature components.
- `lib/` domain logic, scoring, workflows, and Supabase clients.
- `supabase/` migrations and Supabase config.
- `tests/` API tests.
- `docs/` product blueprint and implementation plan.

## Roadmap
- Live bureau/vendor connectors for ingestion.
- Configurable rules and factor weighting UI.
- Batch processing and scenario modeling.
- Advanced model governance and experimentation.
- Production deployment hardening.

## Notes
- `.env.local` is intentionally ignored by Git.
- `.gitattributes` normalizes line endings across platforms.
