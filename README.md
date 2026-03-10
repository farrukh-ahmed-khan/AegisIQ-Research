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
