# AegisIQ Research

AegisIQ Research is an AI-assisted institutional equity research platform designed to automate financial analysis, valuation modeling, and investment screening workflows.

The platform combines artificial intelligence, structured financial data, and professional research tooling to enable analysts, investors, and financial professionals to generate institutional-quality equity research quickly and efficiently.

AegisIQ provides:

• AI-generated equity research reports  
• valuation modeling and analysis  
• structured company workspaces  
• document storage and research notes  
• institutional stock screening  
• watchlist management  
• professional PDF report export

The system is built using a modern serverless architecture optimized for secure cloud deployment.

---

# Platform Overview

AegisIQ is structured around a **research workspace model**, where each security or company has a dedicated analysis environment.

Users can:

• run AI research reports  
• build valuation models  
• store documents and notes  
• maintain watchlists  
• screen for securities  
• export professional research reports

The platform is designed to evolve toward a **full institutional research environment** comparable to professional equity research workflows.

---

# Current Platform Status

**Development Stage:** Active development  
**Deployment:** Production-ready Netlify deployment  
**Latest Implemented Phase:** Step 8 — Institutional Screener Foundation

---

# Current Capabilities (Steps 1–8)

## Research Engine

• AI-generated equity research reports  
• valuation modeling engine  
• AI analyst commentary generation  
• structured report export pipeline  
• professional PDF report generation

---

## Workspace System

Symbol-based research workspaces allow analysts to organize all research related to a specific company.

Capabilities include:

• workspace creation by ticker symbol  
• research note creation  
• note editing and deletion  
• document uploads and storage  
• research history persistence  
• workspace terminal interface

---

## Document Storage System

The platform includes a document architecture for storing research materials.

Features:

• document upload  
• document content retrieval  
• document storage binding  
• workspace-linked document persistence

---

## Watchlist System

Users can create and manage investment watchlists.

Features:

• create watchlists  
• add securities to watchlists  
• remove securities  
• view watchlist contents  
• integration with screener results

---

## Institutional Screener (Step 8)

The first production-safe screening engine has been implemented.

Capabilities:

• screener UI interface  
• filter builder system  
• screener query engine  
• screener preset save/load  
• screening results table  
• add screened symbols to watchlists

Current screener data coverage:

The screener currently operates on **internal symbol coverage derived from the watchlist dataset**.

No external market data APIs are used at this stage.

Future phases will introduce an internal security master dataset and financial metrics.

---

# AegisIQ – Investor Growth MVP

The **Investor Growth module** provides a structured system for managing investor outreach campaigns including:

- AI-assisted campaign generation
- Campaign management dashboard
- Investor CRM
- Investor segmentation
- Campaign approval workflow
- Manual email delivery
- Audit logging

The system is designed with a **review-first architecture**, meaning AI assists in content generation but all actions remain **user-controlled and auditable**.

---

# Architecture Overview

The Investor Growth system is built in progressive batches.

| Batch   | Purpose                                              |
| ------- | ---------------------------------------------------- |
| Batch 1 | Base project setup and database structure            |
| Batch 2 | AI generation service and campaign APIs              |
| Batch 3 | Campaign UI pages                                    |
| Batch 4 | Email delivery + operator dashboard                  |
| Batch 5 | CRM + segments + approval workflow + queue           |
| Phase 6 | Expanded workflow automation and operational scaling |

The system is **Netlify-safe**, **additive**, and follows a **secure API-first architecture**.

---

# Batch 2 – AI Generation & Core APIs

Batch 2 introduces the **first working vertical slice** of the Investor Growth module.

## Campaign Generation Flow

1. User enters campaign inputs
2. `POST /api/investor-growth/generate` generates strategy + draft content using AI
3. `POST /api/investor-growth/save` persists the generated campaign
4. Campaigns can then be viewed and edited through APIs

The system is intentionally **review-first**:

- AI output is **advisory**
- Output is **structured JSON**
- No automatic sending
- No approval bypass
- No scheduling or automation

---

## Generation Model

The AI service returns:

### Strategy Payload

Structured campaign strategy.

### Content Payload

Draft outreach content.

### Flattened Editable Fields

These are exposed for direct editing in the UI:

- `emailSubject`
- `emailBody`
- `smsBody`
- `socialPost`

Flattening prevents the UI from needing to unpack nested JSON structures.

---

## Batch 2 API Routes

### Generation & Save

| Method | Endpoint                      |
| ------ | ----------------------------- |
| POST   | /api/investor-growth/generate |
| POST   | /api/investor-growth/save     |

### Campaign APIs

| Method | Endpoint                            |
| ------ | ----------------------------------- |
| GET    | /api/investor-growth/campaigns      |
| GET    | /api/investor-growth/campaigns/[id] |
| PATCH  | /api/investor-growth/campaigns/[id] |

---

## Deferred APIs (Later Batches)

The following endpoints were intentionally deferred:

- `/api/investor-growth/campaigns/[id]/send-email`
- Contacts CRUD APIs
- Segments CRUD APIs
- Submit / approve / reject APIs

These were implemented in later phases.

---

## Batch 2 File Structure

### New Files

```
lib/investor-growth/validators.ts
lib/investor-growth/auth.ts
lib/investor-growth/services/generation.ts

app/api/investor-growth/generate/route.ts
app/api/investor-growth/save/route.ts
app/api/investor-growth/campaigns/route.ts
app/api/investor-growth/campaigns/[id]/route.ts
```

### Replacement Files

```
lib/investor-growth/types.ts
```

---

## Architecture Notes

### Authentication

Authentication access is abstracted behind a helper:

```
lib/investor-growth/auth.ts
```

This helper:

- reads common request headers
- allows easy replacement with Clerk/session auth later
- keeps route logic auth-agnostic

### Validation

Validation uses **lightweight TypeScript guards** instead of Zod to avoid unnecessary dependencies.

### OpenAI Integration

The generation service uses the **current OpenAI SDK pattern** and returns **structured JSON output** from a constrained prompt.

If the repository already includes an OpenAI wrapper, the service layer can easily be swapped.

---

# Batch 3 – Investor Growth UI

Batch 3 introduces the **first visible product surface**.

## New Pages

### Generation Workspace

```
/investor-growth
```

Features:

- Campaign input form
- AI generation action
- Strategy preview
- Editable generated drafts
- Save campaign functionality

---

### Campaign Dashboard

```
/investor-growth/campaigns
```

Features:

- Campaign table
- Recent campaigns overview
- Status badges
- Navigation to campaign details

---

### Campaign Detail Page

```
/investor-growth/campaigns/[id]
```

Features:

- Editable campaign content
- Strategy display
- Save updates
- Ownership-safe API updates

---

## Batch 3 File Structure

### New Components

```
components/investor-growth/page-shell.tsx
components/investor-growth/section-header.tsx
components/investor-growth/metric-card.tsx
components/investor-growth/status-badge.tsx
components/investor-growth/panel.tsx
components/investor-growth/form-field.tsx
components/investor-growth/text-area-field.tsx
components/investor-growth/campaigns-table.tsx
components/investor-growth/generate-campaign-form.tsx
components/investor-growth/campaign-detail-client.tsx
```

### Pages

```
app/investor-growth/page.tsx
app/investor-growth/campaigns/page.tsx
app/investor-growth/campaigns/[id]/page.tsx
```

---

## UI Design System

The UI follows a **premium institutional SaaS design language**:

- Dark institutional style
- Minimal borders
- Clean grid layout
- Strong typography hierarchy
- Minimal animation
- Product-focused interface

Reusable primitives include:

- Page Shell
- Section Header
- Metric Card
- Status Badge
- Panel/Card
- Form Fields
- Table Components

---

# Batch 4 – Email Delivery + Dashboard

Batch 4 introduces the first **operator workflow beyond drafting**.

It adds:

- Manual email send only
- Approval enforcement before send
- Delivery event logging
- Campaign-level delivery history
- Dashboard metrics + recent campaign overview

The implementation remains within MVP rules:

- No autonomous sending
- No scheduling
- No bulk blast logic
- Explicit user action required
- Subject/body remain editable before send

---

## Batch 4 Architecture Summary

### Manual Email Delivery

A user can send a single campaign email manually from the campaign detail page.

### Approval Enforcement

A campaign must have `approvalStatus === "approved"` before send is allowed.

### Delivery Tracking

Each send attempt:

- creates a delivery event row
- updates campaign delivery fields

### Dashboard Surface

`/investor-growth` now acts as an operator dashboard with:

- campaign counts
- approval counts
- delivery counts
- recent campaign overview

---

## Batch 4 Route Map

### New Routes

| Method | Endpoint                                            |
| ------ | --------------------------------------------------- |
| POST   | /api/investor-growth/campaigns/[id]/send-email      |
| GET    | /api/investor-growth/campaigns/[id]/delivery-events |
| GET    | /api/investor-growth/dashboard                      |

### Existing Routes Reused

| Method | Endpoint                            |
| ------ | ----------------------------------- |
| GET    | /api/investor-growth/campaigns      |
| GET    | /api/investor-growth/campaigns/[id] |
| PATCH  | /api/investor-growth/campaigns/[id] |

---

## Batch 4 File Structure

### New Files

```
lib/investor-growth/services/email.ts

app/api/investor-growth/campaigns/[id]/send-email/route.ts
app/api/investor-growth/campaigns/[id]/delivery-events/route.ts
app/api/investor-growth/dashboard/route.ts

components/investor-growth/dashboard-overview.tsx
components/investor-growth/delivery-history-table.tsx
components/investor-growth/send-email-panel.tsx
```

### Replacement Files

```
lib/investor-growth/types.ts
components/investor-growth/campaign-detail-client.tsx
app/investor-growth/page.tsx
```

---

## Batch 4 Architecture Notes

### Email Delivery Posture

Resend is used as the preferred provider.

The service:

- sends one email per explicit user action
- logs provider result
- writes delivery event row
- updates campaign delivery status

### Approval Posture

Send is hard-blocked at route level unless campaign is approved.

### Dashboard Posture

Dashboard metrics are intentionally simple and derived from campaign + delivery data already present in MVP schema.

### Future-Safe Design

Batch 4 design allows extension later without rewrites:

- batch sends
- segment sends
- contact picker
- scheduled sends
- richer analytics
- webhook-based delivery status updates

---

## Batch 4 SQL Migration

No migration required for Batch 4.

Batch 1 schema already supports email delivery and analytics logging.

---

# Batch 5 – CRM + Segments + Approvals

Batch 5 adds the next workflow layer on top of Investor Growth with three parts:

- Data layer reuse
- Backend APIs + repositories
- Frontend operations pages/components

---

## Batch 5 — What Was Built

### Data

Batch 5 reuses existing investor-growth tables:

- contacts
- segments
- segment members
- campaign approvals
- campaigns
- audit log

An optional migration can add these columns if missing:

- `approval_status`
- `action`
- `note`
- `acted_by`
- `segment_id`

### Backend (APIs + Repositories)

- Contacts: full CRUD (create, read, update, delete)
- Segments: full CRUD + member add/remove/list
- Campaigns: submit for approval, approve, reject, view approval history
- Approval queue: list all pending campaigns
- Segment assignment: assign or clear a segment on a campaign
- Audit log writes on every approval transition and segment change

### Frontend (Pages + Components)

- `/investor-growth/contacts`: table + create/edit form + contact detail panel
- `/investor-growth/segments`: table + create/edit form + membership manager
- `/investor-growth/approvals`: approval queue table + action bar (submit/approve/reject) + history panel
- Campaign detail panel (drop-in): approval actions + segment assignment + approval history embeddable in existing campaign detail page

---

## Batch 5 Business Rules Enforced

- Submit is allowed only from `draft` or `rejected`
- Approve/reject is allowed only from `pending_approval`
- Only approved campaigns can send
- All transitions write to the audit log

---

# Campaign Persistence & Core APIs

Campaign persistence allows full lifecycle management.

## Backend Features

- Campaign save flow
- Repository layer for data access
- Campaign list and detail retrieval
- Editable campaign fields

## APIs

| Method | Endpoint                            |
| ------ | ----------------------------------- |
| POST   | /api/investor-growth/campaigns      |
| GET    | /api/investor-growth/campaigns      |
| GET    | /api/investor-growth/campaigns/[id] |
| PATCH  | /api/investor-growth/campaigns/[id] |

---

# Manual Email Sending

Manual campaign delivery is implemented using **Resend**.

## Environment Variable

```
RESEND_API_KEY
```

## Email API

```
POST /api/investor-growth/campaigns/[id]/send-email
```

### Rules

- Campaign must be **approved**
- Email uses:
  - `email_subject`
  - `email_body`

---

## Delivery Tracking

All send attempts are logged in:

```
investor_growth_delivery_events
```

Fields logged include:

- campaign_id
- user_id
- channel
- recipient_payload_json
- content_payload_json
- delivery_status
- provider_message_id
- provider_response_json
- triggered_at

Campaign status fields updated:

- `email_delivery_status`
- `email_sent_at`

---

# Investor Contacts CRM

A lightweight CRM system for managing investor contacts.

## Contacts APIs

| Method | Endpoint                           |
| ------ | ---------------------------------- |
| GET    | /api/investor-growth/contacts      |
| POST   | /api/investor-growth/contacts      |
| PATCH  | /api/investor-growth/contacts/[id] |
| DELETE | /api/investor-growth/contacts/[id] |

## Contact Fields

- name
- email
- phone
- organization
- role
- investor_type
- tags_json
- notes

### UI

```
/investor-growth/contacts
```

Features:

- Add contact
- Edit contact
- Delete contact

---

# Investor Segments

Segmentation allows grouping contacts for targeted campaigns.

## Segment APIs

| Method | Endpoint                      |
| ------ | ----------------------------- |
| GET    | /api/investor-growth/segments |
| POST   | /api/investor-growth/segments |

## Database Tables

```
investor_segments
investor_segment_members
```

### UI

```
/investor-growth/segments
```

Contacts can be assigned to segments.

---

# Campaign Segmentation

Campaigns can target specific segments.

### Campaign Field

```
segment_id
```

### Behavior

When sending campaign emails:

Only contacts in the selected segment receive the email.

---

# Campaign Approval Workflow

Campaign lifecycle:

```
draft → pending_approval → approved / rejected
```

## Approval APIs

| Method | Endpoint                                    |
| ------ | ------------------------------------------- |
| POST   | /api/investor-growth/campaigns/[id]/submit  |
| POST   | /api/investor-growth/campaigns/[id]/approve |
| POST   | /api/investor-growth/campaigns/[id]/reject  |

Approval records stored in:

```
investor_campaign_approvals
```

---

# Audit Logging

All critical actions are logged.

### Audit Table

```
investor_growth_audit_log
```

### Logged Actions

- campaign_created
- campaign_updated
- campaign_submitted
- campaign_approved
- campaign_rejected
- campaign_email_sent

This ensures **traceability and operational transparency**.

---

# Result

The **Investor Growth MVP** now includes:

- AI-assisted campaign generation
- Campaign dashboard and detail management
- Investor CRM
- Investor segmentation
- Campaign approval workflow
- Manual email sending
- Delivery event tracking
- Full audit logging

This provides a complete **foundation for managing investor outreach campaigns** inside the AegisIQ platform.

# Architecture

## Frontend

• Next.js 14 (App Router)  
• React  
• TypeScript

---

## Backend

• Serverless API routes (Next.js App Router)  
• Neon PostgreSQL database  
• Repository pattern for data access

---

## Infrastructure

• Netlify deployment  
• serverless build pipeline  
• environment variable configuration

---

## Authentication

• Clerk authentication

---

## Payments

• Stripe integration (subscription / billing support)

### Stripe Subscription Flow (Implemented)

The application now uses Stripe for recurring subscription checkout with Clerk-based access control.

Implemented APIS:

| Method | Endpoint                                  | Purpose                                                                                |
| ------ | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| POST   | /api/stripe/create-checkout-session       | Starts Stripe Checkout in `subscription` mode for signed-in users                      |
| POST   | /api/stripe/create-billing-portal-session | Opens Stripe Billing Portal for manage/cancel actions                                  |
| POST   | /api/stripe/webhook                       | Receives Stripe events and updates Clerk subscription metadata                         |
| POST   | /api/stripe/sync-subscription             | Fallback sync after successful checkout (useful when webhook is delayed/local testing) |

Checkout UX behavior:

- If user is signed out: pricing CTA prompts sign-in before purchase
- If user is signed in and not subscribed: pricing CTA shows `Purchase`
- If user has active subscription: CTA shows manage/cancel behavior via billing portal

Subscription state source:

- Stripe status is synced into Clerk metadata (`publicMetadata.subscription` and `publicMetadata.subscriptionActive`)
- Active statuses considered: `active`, `trialing`

Protected access behavior:

Unauthenticated users are redirected to sign-in, and users without active subscription are redirected to `/pricing` for protected surfaces.

Protected routes include:

- `/dashboard`
- `/report/*`
- `/reports`
- `/workspace/*`
- `/investor-growth/*`
- related APIs under `/api/workspaces/*`, `/api/reports/*`, `/api/investor-growth/*`

Required environment variables for payments:

```dotenv
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRICE_PRO=
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE=
NEXT_PUBLIC_APP_URL=
```

Stripe webhook endpoint (Netlify deployment):

```text
https://<your-netlify-domain>/api/stripe/webhook
```

Recommended Stripe webhook events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

---

## AI Services

• OpenAI API

Used for:

• research report generation  
• AI analyst commentary  
• analysis augmentation

---

## Document Generation

• `@react-pdf/renderer`

Used for:

• research report PDF export  
• institutional report formatting

---

# Project Structure
