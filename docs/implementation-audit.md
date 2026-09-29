# Implementation audit — Judicial Fees System

**Date:** 2026-09-23  
**Mode:** Greenfield (no existing application source in this workspace)

## Materials inspected

| Asset | Status |
| --- | --- |
| `Judicial_Fees_System_Codex_Master_Build_Spec.md` | Present — master spec |
| `logo.jpg` | Present — Ministry of Justice emblem (visual identity only) |
| `stitch_ (1).zip` | Present — 29 screens + `DESIGN.md` |
| Prior React/Fastify/domain source (`src/domain/*`, `server/*`) | **Absent** |
| Verified statutory fee tables | **Absent** |

## Stitch inventory (UX reference only)

| Folder | Surface |
| --- | --- |
| `_29` | Institutional login |
| `_19` | Unified entry / public portal |
| `_22` | Main dashboard |
| `_21` | Cases / dockets list |
| `_13` | New case registration |
| `_25` | Case facts / claims |
| `_24` | Claim value strategy |
| `_14` | Legal classification |
| `_16` | Calculation processing |
| `_23` | Explainable calculation result |
| `_15` | Preliminary vs revised review |
| `_5` | Archived calculation record |
| `_12` | Calculation history |
| `_18` | Case file |
| `_28` | Review queue |
| `_27` | Calculation audit / review |
| `_4` | Financial review dashboard |
| `_10` | Official review register |
| `_26` | Audit log |
| `_20` | Legal rules registry |
| `_3` | Legal rule detail |
| `_9` | Rule editor / simulation |
| `_6` | Rules management |
| `_17` | User management |
| `_11` | RBAC matrix |
| `_7` | System administration |
| `_8` | Security policy settings |
| `_1` | Security alert |
| `_2` | Identity / certification failure |

Design tokens and shell come from `stitch_/sovereign_judicial_workbench/DESIGN.md`. Stitch HTML is **not** copied into production (Tailwind CDN / Material Symbols CDN / remote logo URLs).

## Implications

1. Domain modules named in the spec (`calculate.ts`, `catalog.ts`, …) must be **recreated** from the spec’s conceptual contracts, not from recovered source.
2. Fee brackets and legal citations in Stitch are **reference UX copy**. They are **not** verified law. The engine uses an explicit **DEMO / UNVERIFIED** rule pack until a verified rule set is supplied.
3. Branding uses `logo.jpg` as visual identity. The product does **not** claim to be a live Ministry of Justice or ITIDA/Gov-PKI service.
4. Auth is `DemoIdentityProvider` behind `IdentityProvider`. Production OIDC is an unimplemented adapter.

## First milestone (spec §162)

Login → Case → Facts → Claim value → Classification → Rule → Calculation → Explanation → Estimate → Review → Approval → Audit → History
