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

# Investor Growth MVP

This module provides a lightweight Investor CRM, segmentation system, campaign management workflow, and email delivery functionality for investor outreach.

---

# Features Implemented

## 1. Campaign Persistence & Core APIs

Implemented full campaign persistence and management APIs.

### Backend

- Implemented campaign save flow with full payload persistence in the existing investor campaign table.
- Added repository layer methods for:
  - Create campaign
  - List campaigns
  - Fetch campaign by ID
  - Update campaign

### APIs

| Method | Endpoint                            | Description                     |
| ------ | ----------------------------------- | ------------------------------- |
| POST   | /api/investor-growth/campaigns      | Save campaign                   |
| GET    | /api/investor-growth/campaigns      | Fetch campaign list             |
| GET    | /api/investor-growth/campaigns/[id] | Fetch campaign by ID            |
| PATCH  | /api/investor-growth/campaigns/[id] | Update editable campaign fields |

### Campaign Generation Flow

Users now follow a structured workflow:

1. Generate campaign content
2. Review generated output
3. Explicitly save the campaign
4. Manage it through the campaign dashboard

---

# 2. Campaign Dashboard & Detail Management

### Campaign Dashboard

Implemented a full campaign management dashboard.

**Route**

```
/investor-growth/campaigns
```

### Features

- Campaign table view
- Pagination support
- Status badges:
  - `draft`
  - `pending_approval`
  - `approved`
  - `rejected`

### Campaign Detail Page

A dedicated detail page allows users to review and manage generated campaign content.

**Route**

```
/investor-growth/campaigns/[id]
```

### Editable Content

Users can edit generated content including:

- Email Subject
- Email Body
- SMS Message
- Social Post

All changes can be saved via API updates.

---

# 3. Manual Email Sending (Approved Campaigns Only)

Implemented manual email sending using **Resend**.

### Email Provider

Resend is used for transactional email delivery.

Environment Variable:

```
RESEND_API_KEY
```

### API Endpoint

```
POST /api/investor-growth/campaigns/[id]/send-email
```

### Email Sending Rules

- Campaign **must be approved** before sending
- Email content is pulled from:
  - `email_subject`
  - `email_body`

### Delivery Tracking

Each send attempt is logged in:

```
investor_growth_delivery_events
```

Logged fields include:

- campaign_id
- user_id
- channel (email)
- recipient_payload_json
- content_payload_json
- delivery_status
- provider_message_id
- provider_response_json
- triggered_at

### Campaign Status Updates

Campaign delivery status is tracked with:

- `email_delivery_status`
- `email_sent_at`

### UI Integration

Campaign detail page now includes:

- **Send Email button**
- Confirmation modal before sending
- Recipient email input
- Delivery status tracking

---

# 4. Investor Contacts CRM

Implemented a lightweight investor CRM system.

### Contacts APIs

| Method | Endpoint                           |
| ------ | ---------------------------------- |
| GET    | /api/investor-growth/contacts      |
| POST   | /api/investor-growth/contacts      |
| PATCH  | /api/investor-growth/contacts/[id] |
| DELETE | /api/investor-growth/contacts/[id] |

### Contact Fields

- name
- email
- phone
- organization
- role
- investor_type
- tags_json
- notes

### UI Page

```
/investor-growth/contacts
```

Features:

- Add contact
- Edit contact
- Delete contact
- Manage investor information

---

# 5. Investor Segmentation

Implemented segmentation system to group investor contacts.

### Segments APIs

| Method | Endpoint                      |
| ------ | ----------------------------- |
| GET    | /api/investor-growth/segments |
| POST   | /api/investor-growth/segments |

### Database Tables

```
investor_segments
investor_segment_members
```

### Segments UI

```
/investor-growth/segments
```

Users can:

- Create segments
- Assign contacts to segments
- Manage investor groups

---

# 6. Segment Assignment to Campaigns

Campaigns can now target a specific segment.

### Campaign Field

```
segment_id
```

### Behavior

When sending campaign emails:

- Only contacts belonging to the selected segment will receive the email.

---

# 7. Campaign Approval Workflow

Implemented a structured campaign approval process.

### Campaign Status Flow

```
draft → pending_approval → approved / rejected
```

### Approval APIs

| Method | Endpoint                                    |
| ------ | ------------------------------------------- |
| POST   | /api/investor-growth/campaigns/[id]/submit  |
| POST   | /api/investor-growth/campaigns/[id]/approve |
| POST   | /api/investor-growth/campaigns/[id]/reject  |

### Approval Storage

Approval records are stored in:

```
investor_campaign_approvals
```

---

# 8. Audit Logging

Implemented full audit logging for important system actions.

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

This ensures traceability and operational transparency across campaign lifecycle events.

---

# Result

The **Investor Growth MVP** now includes:

- Campaign generation and persistence
- Campaign management dashboard
- Investor CRM
- Investor segmentation
- Campaign approval workflow
- Manual email sending
- Delivery tracking
- Full audit logging

This provides a complete foundational system for managing investor outreach campaigns.

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
