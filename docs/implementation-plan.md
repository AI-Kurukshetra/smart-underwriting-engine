# AI-Powered Underwriting & Risk Intelligence Platform

## Objective
Build the underwriting MVP for personal loans using Next.js, Supabase, and Vercel. The initial product focuses on application intake, document handling, risk scoring, workflow-driven decisions, auditability, and portfolio visibility.

## Stack
- Next.js 16 with App Router and TypeScript
- Tailwind CSS v4
- Supabase Postgres, Auth, Storage, and Row Level Security
- Vercel for deployment and preview environments

## MVP Modules
- Application intake and queue management
- Customer and application records
- Document upload and extraction pipeline
- Deterministic risk scoring engine
- Automated decision workflow
- Manual review queue
- Audit log and explainability support
- Compliance checks and portfolio metrics
- Versioned REST API under `/api/v1`

## Delivery Phases
1. Foundation
   - project structure
   - environment management
   - Supabase utilities
   - schema and RLS
2. Product core
   - dashboard
   - application list and details
   - document ingestion
   - review queue
3. Decisioning
   - scoring engine
   - workflow engine
   - rationale and reason codes
4. Hardening
   - live Supabase persistence
   - OCR integration
   - auth and tenant isolation
   - Vercel deployment

## Required Secrets
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OCR_PROVIDER_API_KEY`
- `OPENAI_API_KEY` if explanation generation is enabled

## Current Implementation Status
The repo now includes the first product scaffold:
- dashboard and application review UI
- mock-backed API endpoints
- deterministic score and decision services
- Supabase client helpers
- initial SQL migration and environment template

