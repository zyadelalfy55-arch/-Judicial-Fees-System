# CODEx MASTER BUILD SPEC — Judicial Fees System
## Production-Ready Web Platform / Sovereign Judicial Workbench

> **Document purpose:** This is the master implementation specification to hand to Codex together with the project/reference assets.  
> **Primary objective:** Build the Judicial Fees System as a production-ready web application while preserving the project's original idea, business model, calculation philosophy, governance workflow, roles, explainability, auditability, and legal-rule architecture.
>
> **Important:** The reference UI contains institutional/government wording, official-looking branding, legal references, and integrations such as ITIDA/Gov-PKI. Treat these as **design/reference concepts unless verified by the actual project owner and official integration specifications**. Do not fabricate live integrations, certificates, legal facts, official claims, or government connectivity.

---

# 0. EXECUTION DIRECTIVE FOR CODEX

You are acting as a **Senior Full-Stack Software Architect + Senior React Engineer + Backend Engineer + Security Engineer + QA Engineer + DevOps Engineer**.

Your job is not to create a beautiful mockup only.

Your job is to transform the supplied Judicial Fees System concept and reference screens into a **maintainable, testable, secure, production-oriented web application**.

You must work in this order:

```text
UNDERSTAND
    ↓
AUDIT EXISTING PROJECT
    ↓
FREEZE BUSINESS CONCEPT
    ↓
MODEL DOMAIN
    ↓
DEFINE ARCHITECTURE
    ↓
BUILD DESIGN SYSTEM
    ↓
BUILD AUTH + RBAC
    ↓
BUILD CASE WORKFLOW
    ↓
BUILD RULE ENGINE
    ↓
BUILD CALCULATION ENGINE
    ↓
BUILD REVIEW / GOVERNANCE
    ↓
BUILD AUDIT
    ↓
BUILD DASHBOARD
    ↓
BUILD SERVICES
    ↓
TEST EVERYTHING
    ↓
SECURITY HARDENING
    ↓
PRODUCTION BUILD
```

Do not skip directly to UI implementation.

Do not rewrite working business logic simply because a different library is popular.

Do not introduce technologies without a concrete engineering reason.

Do not invent legal rules.

Do not pretend that a mock integration is a live government integration.

---

# 1. SOURCE OF TRUTH AND PRIORITY

When requirements conflict, use this priority:

```text
1. Actual existing source code / business logic
2. Verified project requirements
3. Existing domain model and calculation rules
4. Reference screenshots and HTML designs
5. This implementation specification
6. Generic framework conventions
```

The screenshots are primarily a **UX/UI reference**.

The existing domain/calculation logic is the **business source of truth**.

Never change business meaning merely to match a visual mockup.

---

# 2. MATERIALS PROVIDED

The implementation package includes:

## 2.1 Ministry / institutional logo

```text
logo.jpg
```

Use it as the visual identity reference.

Do not alter the emblem itself.

Do not claim the website is an official Ministry of Justice service unless that authorization is explicitly provided.

---

## 2.2 Stitch design package

```text
stitch_ (1).zip
```

The package contains approximately 29 reference screens, each with:

```text
code.html
screen.png
```

and a central design specification:

```text
sovereign_judicial_workbench/DESIGN.md
```

The Stitch HTML files use:

```text
Arabic
RTL
Tailwind CSS via CDN
Material Symbols
IBM Plex Sans Arabic
```

These HTML files are **reference designs**, not the final production architecture.

---

# 3. COMPLETE REFERENCE SCREEN INVENTORY

The 29 reference screens represent the following application surfaces.

## `_29` — Institutional Login

Purpose:

```text
Institutional login
Identity entry
Secure session initiation
```

Key concepts:

- Ministry branding
- Institutional SSO/e-ID concept
- Username / institutional identifier
- Password
- Security messaging
- Support access
- Official-session language

Production requirement:

Do not hardcode fake SSO.

Build an authentication abstraction:

```text
AuthProvider
 ├── DemoAuthProvider
 └── ProductionOIDCProvider
```

---

## `_19` — Unified Entry / Public Portal

Purpose:

```text
Entry point
Public/authorized query
Case/reference lookup
```

Important:

This screen should not bypass authorization.

If public lookup exists, explicitly define:

```text
Public Data
vs
Authenticated Data
```

---

## `_22` — Main Dashboard

Purpose:

```text
Work overview
Recent calculations
Quick actions
Recent records
Notifications
```

Main actions:

```text
Create New Calculation
Review Decision
Continue Calculation
Print Order
Review Notes
View Notice
Payment Document
```

---

## `_21` — Cases / Dockets List

Purpose:

```text
Search
Filter
Import from electronic docket
Create new case
View case
Continue fee calculation
Audit claim
Edit fees
Export
Print
```

Main data:

```text
Case Number
Year
Case Type
Court
Parties
Status
Calculation Status
Review Status
Last Updated
```

---

## `_13` — New Case Registration

Purpose:

```text
Create a new case
```

Sections:

```text
1. Jurisdiction / Court
2. Plaintiff
3. Plaintiff Representative
4. Defendant
5. Service / Notification Address
6. Filing Dates
7. Documents
8. Legal Reference
```

This is a major workflow entry point.

---

## `_25` — Case Facts / Claims

Purpose:

```text
Capture facts needed to determine the claim and fee basis
```

Sections shown by the reference:

```text
1. Date of obligation / contract
2. Parties and exemption classification
3. Multiple defendants / independent interests
4. Additional / alternative claims
5. Geographic / notification information
```

The exact legal fields must come from verified business requirements.

---

## `_24` — Claim Value Strategy

Purpose:

```text
Determine the financial basis subject to the fee
```

This is one of the most important domain screens.

It should support:

```text
Claim decomposition
Sub-items
Aggregation
Derived claim value
Financial basis
Calculation proof
```

Do not calculate the final fee in the browser.

---

## `_14` — Legal Classification / Claim Typing

Purpose:

```text
Classify and legally characterize the main claim
```

The system should capture:

```text
Case Type
Request Type
Claim Structure
Primary Request
Additional Requests
Legal Classification
```

Classification must feed the Domain Engine.

---

## `_16` — Calculation Processing

Purpose:

```text
Show that the system is resolving rules and calculating fees
```

This is not just a loading spinner.

Show meaningful stages:

```text
Validate facts
Resolve case profile
Resolve effective rule
Resolve fee treatment
Derive financial basis
Calculate fees
Build explanation
Persist estimate
Create audit event
```

Never expose internal secrets or raw stack traces.

---

## `_23` — Explainable Calculation Result

This is one of the most important screens.

It explicitly separates:

```text
Fact Registry
Derived Values
Statutory Rule
Statutory Gate
Computation Trail
Legal Citations
Final Total
```

The final result must answer:

```text
What did the user enter?
What values were derived?
Which rule was selected?
Why did the rule apply?
How was the amount calculated?
Which legal source supports it?
```

---

## `_15` — Preliminary vs Revised Calculation Review

Purpose:

```text
Compare calculations
Show changes
Show legal basis
Supervisor approval
Digital approval concept
```

This should support:

```text
Original version
Revised version
Difference
Reason
Rule version
Reviewer
Timestamp
Decision
```

---

## `_5` — Archived Calculation Record

Purpose:

```text
Immutable / historical calculation view
```

Shows:

```text
Original Snapshot
Derived Values
Legislative Freeze
Dual-Key Approval Chain
Official Calculation
```

This should be implemented as a historical snapshot, not as a live recalculation that can silently change when rules are updated.

---

## `_12` — Calculation History

Purpose:

```text
Search historical calculations
Filter
Export
View
Print
Open official record
```

---

## `_18` — Case File

Purpose:

```text
Full case workspace
```

Sections:

```text
Case Overview
Requests
Facts & Evidence
Claim Value
Calculation History
Audit History
Documents
Financial Position
```

This is the central workspace for a case.

---

## `_28` — Review Queue

Purpose:

```text
Queue of calculations waiting for review
```

Features:

```text
Search
Urgent filter
Reset
Export
Compact / Detailed view
Start Review
Open Case
```

---

## `_27` — Calculation Audit / Review

Purpose:

```text
Detailed reviewer workspace
```

Sections:

```text
Approved Case Facts
Legal Compliance Tree
Confidential Review Notes
Derived Values
Claim Basis
Decision
```

Actions:

```text
Approve + Issue Final Order
Return for Correction
Print Review Draft
View History
```

Important:

Approval must be a backend transaction.

Do not rely on a frontend button to grant approval.

---

## `_4` — Financial Review Dashboard

Purpose:

```text
Review workload
Priority cases
Deadlines
Approval decisions
```

States:

```text
New
Priority
Dual Approval
Returned
Approved
Escalated
```

---

## `_10` — Official Review / Approval Register

Purpose:

```text
Official decisions
Audit approvals
Financial review decisions
Export
Print
Docket memo
Objection memo
Session history
```

---

## `_26` — Audit Log

Purpose:

```text
Immutable operational history
```

Search by:

```text
Case
User
Role
Action
Entity
Date
Event ID
```

Support:

```text
Integrity verification
Audit package export
Hash chain inspection
```

---

## `_20` — Legal Rules Registry

Purpose:

```text
Browse legal rules
Legal sources
Versions
Effective dates
Published status
```

Must support:

```text
Search
Filter
View rule
Create draft
Create revision
Compare versions
View source
```

---

## `_3` — Legal Rule Detail

Purpose:

```text
Detailed rule definition
```

Sections:

```text
Legislative Intent
Applicability Conditions
Progressive Brackets
Additional Fees
Official Text
Official Sources
Version Tree
```

Critical requirement:

Do not populate legal text from generated content.

Legal text must come from verified source documents.

---

## `_9` — Rule Editor / Simulation

Purpose:

```text
Edit draft rule
Add bracket
Edit bracket
Delete bracket
Save draft
Simulate financial impact
Publish
```

Publishing must require authorization and approval.

---

## `_6` — Rules Management

Purpose:

```text
Manage legal rules
Create new rule
Compare versions
Inspect constitutional/legal basis
Draft update
```

---

## `_17` — User Management

Purpose:

```text
Users
Roles
Digital certificates
User status
Governance
```

---

## `_11` — RBAC Matrix

Purpose:

```text
Roles
Permissions
Access rules
Governance evidence
```

Do not implement authorization as scattered role checks.

Prefer:

```text
Capability
 ↓
Permission
 ↓
Role
```

---

## `_7` — Digital Sovereignty / System Administration

Purpose:

```text
System administration
Security controls
Pending access approvals
Operational administration
```

This screen should only expose real capabilities.

Do not create fake infrastructure controls.

---

## `_8` — Security Policy Settings

Purpose:

```text
Session policy
Security policy
Certificate configuration
Conflict-of-interest governance
```

Production controls must be backed by actual server-side configuration.

---

## `_1` — Security Alert

Purpose:

```text
Unauthorized access attempt
Security incident
Privilege restriction
Escalation
```

This should connect to actual security event data where implemented.

---

## `_2` — Identity / Certification Failure

Purpose:

```text
External identity or signing service unavailable
Diagnostic information
Safe fallback
Encrypted draft
Retry
```

Production implementation should use an adapter:

```text
IdentityService
SigningService
```

with:

```text
Real Provider
Mock Provider
```

Do not pretend a mock is ITIDA/Gov-PKI.

---

# 4. BUSINESS CONCEPT — DO NOT CHANGE

The system remains a:

> **Rule-Based Judicial Fee and Court-Service Calculation Platform**

It must support:

```text
Cases
Courts
Case Types
Court Levels
Filing / Final Stages
Known / Unknown Values
Claim Structures
Final Claims
Accruals
Fee Relief
Reduced Fees
Exemptions
Standard Fees
Review Required
Progressive Fees
Court Services
Estimates
Legal Sources
Rule Versions
Effective Dates
Governance
Audit
Dashboard
```

The system must not become:

```text
Generic calculator
Generic CRM
E-commerce platform
Generic admin dashboard
```

---

# 5. CURRENT CORE ARCHITECTURE TO PRESERVE

The previously analyzed project uses:

```text
React 19
TypeScript
Vite
React Router
Fastify
Zod
JOSE / JWT
SQLite / node:sqlite
Vitest
```

Domain modules include:

```text
src/domain/types.ts
src/domain/catalog.ts
src/domain/case-profiles.ts
src/domain/fee-treatment.ts
src/domain/calculate.ts
src/domain/service-fees.ts
src/domain/rule-parameters.ts
src/domain/governance.ts
src/domain/generated-case-types.ts
```

Backend includes:

```text
server/index.ts
server/auth.ts
server/db.ts
server/service-schema.ts
```

Frontend infrastructure includes:

```text
src/main.tsx
src/App.tsx
src/auth.tsx
src/api.ts
```

Preserve the conceptual boundaries.

---

# 6. TARGET PRODUCTION ARCHITECTURE

Use a modular monolith first.

```text
                    WEB CLIENT
                         │
                         ▼
               React + TypeScript
                         │
                         ▼
                    API Client
                         │
                         ▼
                  Fastify REST API
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       Authentication         Authorization
              │                     │
              └──────────┬──────────┘
                         ▼
                    Validation
                         │
                         ▼
                    Application
                      Layer
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
        Cases           Rules         Services
          │              │              │
          ▼              ▼              ▼
      Profiles      Governance      Service Engine
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                 Calculation Engine
                         │
                         ▼
                  Repository Layer
                         │
                ┌────────┴────────┐
                ▼                 ▼
             SQLite          PostgreSQL
             Dev/Test        Production
                         │
                         ▼
                    Audit System
                         │
                         ▼
                  Observability
```

---

# 7. TECHNOLOGY DECISIONS

## 7.1 React

### Keep

```text
React 19
```

No reason to replace React.

---

## 7.2 TypeScript

### Keep

```text
TypeScript
```

Required because the Domain is complex and rule-driven.

---

## 7.3 Vite

### Keep for the SPA

The application already has a natural separation:

```text
React SPA
+
Fastify API
```

Do not migrate to Next.js just for popularity.

---

## 7.4 React Router

### Keep

It matches the SPA architecture.

---

## 7.5 Tailwind

The Stitch references use Tailwind through CDN.

For production:

**Do not ship the design as HTML files with a Tailwind CDN dependency.**

If Tailwind is selected for the implementation, install and build it locally.

However, the project should not be rewritten just to adopt Tailwind.

The most important requirement is:

```text
Reusable Design System
+
Design Tokens
+
Consistent Components
```

not the CSS framework name.

---

## 7.6 Material Symbols

The Stitch design uses Material Symbols.

Options:

```text
Material Symbols
```

or:

```text
Lucide React
```

The existing project already uses Lucide React.

### Decision

Keep the existing icon strategy unless exact visual fidelity requires Material Symbols.

If Material Symbols is used, self-host or package it for production instead of relying on an external font CDN.

---

## 7.7 IBM Plex Sans Arabic

### Keep

This is the primary Arabic typography.

---

## 7.8 Fetch vs Axios

Current:

```text
fetch()
```

Keep it unless advanced HTTP interception becomes necessary.

Axios is optional, not an architectural upgrade.

---

## 7.9 State Management

Start with:

```text
useState
useMemo
useEffect
Context
```

Use:

```text
TanStack Query
```

only if server-state caching/refetching becomes sufficiently complex.

Do not add Redux automatically.

---

# 8. BACKEND VALIDATION STRATEGY

Current project uses Zod.

Keep Zod for domain/input validation.

Fastify's native ecosystem also supports schema-based validation and serialization. Fastify's documentation recommends schema-based validation/serialization for routes. citeturn0search5turn0search10

Recommended boundary:

```text
HTTP Request
 ↓
Route Schema / Zod
 ↓
DTO
 ↓
Application Service
 ↓
Domain
```

Do not let raw HTTP request objects enter the Domain.

---

# 9. DATABASE STRATEGY

## Development

```text
SQLite
```

## Production

```text
PostgreSQL
```

Do not let Domain code depend directly on SQLite APIs.

Use:

```text
Repository Interface
```

Example:

```text
EstimateRepository
CaseRepository
RuleRepository
AuditRepository
UserRepository
```

Then:

```text
SQLiteRepository
PostgresRepository
```

---

# 10. AUTHENTICATION STRATEGY

## Current / Demo

```text
Demo Login
JWT
JOSE
sessionStorage
```

## Production target

```text
OIDC / SSO
+
MFA where required
```

OpenID Connect is designed for identity interactions and authentication on top of OAuth 2.0. citeturn0search2turn0search7

Do not invent an institutional identity provider.

Create an interface:

```text
IdentityProvider
```

Implement:

```text
DemoIdentityProvider
ProductionOIDCIdentityProvider
```

---

# 11. BROWSER SESSION SECURITY

For production, reconsider storing long-lived access tokens in `sessionStorage`.

Preferred architecture for a browser-based institutional application:

```text
Secure HTTPS
+
HttpOnly Cookie
+
Secure
+
SameSite
+
Short-lived session/access mechanism
+
CSRF protection where applicable
```

The exact strategy must match the chosen OIDC flow and infrastructure.

Do not expose sensitive tokens to JavaScript unless there is a documented reason.

---

# 12. RBAC ARCHITECTURE

Current conceptual roles:

```text
estimator
supervisor
legal_reviewer
project_manager
leader
```

The Stitch screens show richer institutional terminology such as:

```text
قلم الكتاب
مكتب الرسوم
رئيس القلم
المراجع المالي
المشرف العام
إدارة النظام
```

Do not silently replace the existing role model.

Instead, create:

```text
Permissions / Capabilities
```

Example:

```text
case:create
case:view
case:edit
calculation:create
calculation:view
calculation:submit-review
calculation:approve
calculation:return
rule:view
rule:create
rule:edit
rule:review
rule:publish
audit:view
audit:verify
users:manage
security:manage
dashboard:view
```

Then map roles to permissions.

This allows institutional role naming to evolve without rewriting authorization logic.

---

# 13. CASE DOMAIN

Core entities:

```text
Case
Court
CourtLevel
CaseType
CaseProfile
Claim
Accrual
Party
Representative
Document
Estimate
FeeLine
RuleSet
RuleVersion
LegalSource
AuditEvent
ReviewDecision
```

---

# 14. CASE INPUTS

The existing calculation workflow supports concepts such as:

```text
courtId
caseTypeId
courtLevel
stage
valueKind
claimStructure
claimAmount
awardedAmount
prepaid
settlementAmount
finalOutcome
finalTiming
finalClaims
finalAccruals
urgent
feeRelief
caseFacts
```

Preserve these concepts.

Do not flatten them into one generic amount field.

---

# 15. CLAIM STRUCTURES

Support the existing concepts:

```text
single
same-basis
different-bases
rent-termination
unsure
```

The UI should guide the user through the correct form based on the selected case type/profile.

---

# 16. FINAL CLAIMS

Final claims can contain:

```text
id
label
requestKind
valueKind
disposition
aggregation
groupKey
claimedAmount
awardedAmount
```

The UI must allow the Domain to distinguish:

```text
claimed
awarded
dismissed
settled
other disposition
```

Only values permitted by the applicable rule should feed calculation.

---

# 17. ACCRUALS

Support the conceptual types:

```text
rent
yield
daily-compensation
interest
```

and concepts such as:

```text
filingBasis
accruedToJudgment
```

Do not calculate these in a React component.

---

# 18. FEE TREATMENT

Supported states:

```text
standard
reduced
exempt
review
```

The UI must make the state explicit.

Example:

```text
تم تطبيق الرسم القياسي
```

or:

```text
يستلزم الحساب مراجعة قانونية
```

Never communicate status only through color.

---

# 19. MONEY / PRECISION

Do not use JavaScript floating point for financial arithmetic.

Use integer minor units.

Current project uses:

```text
millieme
```

Conceptually:

```text
1 EGP = 1000 millieme
```

All calculations must be deterministic.

Required tests:

```text
rounding
minimum
maximum
progressive brackets
caps
zero
very large values
decimal input
negative input rejection
```

---

# 20. CALCULATION ENGINE

The engine should be independent from:

```text
React
Fastify
HTTP
Database
```

Ideal:

```text
calculateFees(input, effectiveRule)
      ↓
CalculationResult
```

Result should include:

```text
total
feeLines
warnings
assumptions
sources
ruleSetId
ruleSetVersion
appliedRuleChanges
computationTrail
derivedValues
```

---

# 21. EXPLAINABILITY MODEL

The result screen must be built around five layers:

## Layer 1 — Raw Facts

```text
Fact Registry
```

## Layer 2 — Derived Values

```text
Derived Values
```

## Layer 3 — Legal Rule

```text
Statutory Rule
```

## Layer 4 — Eligibility Gate

```text
Statutory Gate
```

## Layer 5 — Mathematics

```text
Computation Trail
```

Then:

```text
Final Total
```

This is a defining characteristic of the product.

---

# 22. RULE GOVERNANCE

Rules must be versioned.

Minimum model:

```text
Rule
 ├── id
 ├── name
 ├── legalSource
 ├── status
 └── versions[]
```

Version:

```text
RuleVersion
 ├── version
 ├── effectiveDate
 ├── publishedAt
 ├── scope
 ├── parameters
 ├── source
 ├── createdBy
 ├── approvedBy
 └── checksum
```

---

# 23. EFFECTIVE RULE RESOLUTION

The calculation must use:

```text
Calculation Date
+
Court
+
Case Type
+
Published Rule Versions
```

Resolver:

```text
resolveEffectiveRuleConfiguration()
```

Concept:

```text
Candidate Rules
 ↓
Published only
 ↓
Effective date <= calculation date
 ↓
Scope match
 ↓
Highest valid version
 ↓
Effective Rule
```

Never use:

```text
latest database row
```

as a substitute for legal effective-date logic.

---

# 24. RULE CHANGE WORKFLOW

```text
Draft
 ↓
Legal Review
 ↓
Approve / Reject
 ↓
Publish
 ↓
Effective Date
 ↓
Available to Calculation Engine
```

Constraints:

```text
No self-review
No unauthorized scope
No publish before approval
No duplicate publication
No silent overwrite
```

---

# 25. HISTORICAL CALCULATIONS

This is critical.

A historical calculation must preserve:

```text
Input Snapshot
Rule Version
Rule Parameters
Legal Source
Derived Values
Calculation Result
Reviewer
Approval
Timestamp
```

Do not recalculate old records using today's rules.

Use:

```text
Legislative Freeze
```

conceptually.

---

# 26. AUDIT ARCHITECTURE

Every sensitive action should create an audit event.

Example:

```text
actorId
actorRole
action
entityType
entityId
timestamp
metadata
previousHash
eventHash
```

Hash chain:

```text
Event A
  ↓
hash A
  ↓
Event B
  ↓
hash B
  ↓
Event C
```

Audit should be append-oriented.

Do not allow ordinary users to edit or delete audit records.

---

# 27. APPROVAL MODEL

Approval is not a UI state.

It is a server-side transition.

Example:

```text
DRAFT
 ↓ submit
PENDING_REVIEW
 ↓ approve
APPROVED
 ↓ publish/issue
ISSUED
```

Alternative:

```text
PENDING_REVIEW
 ↓ return
RETURNED
 ↓ resubmit
PENDING_REVIEW
```

Every transition must be:

```text
Authorized
Validated
Audited
Atomic
```

---

# 28. CASE STATE MACHINE

Use an explicit state machine rather than scattered booleans.

Example:

```text
DRAFT
 ↓
SUBMITTED
 ↓
CALCULATING
 ↓
CALCULATED
 ↓
PENDING_REVIEW
 ├── RETURNED
 │     ↓
 │   DRAFT / RESUBMIT
 │
 └── APPROVED
       ↓
     ISSUED
```

Do not allow illegal transitions.

---

# 29. REVIEW QUEUE

Review queue must be server-driven.

Filters:

```text
Status
Priority
Court
Case Type
Reviewer
Date
SLA / Deadline
```

Each item should expose:

```text
Case
Calculation
Rule Version
Current Status
Age
Priority
Assigned Reviewer
```

---

# 30. COURT SERVICES

Keep the separate service calculation engine.

Services represented by the current project include concepts such as:

```text
registry-copy
certificate
judicial-paper-copy
named-search
theoretical-search
translation
order
cassation-memorandum
announcement
execution
attestation
power-of-attorney-attestation
signature-or-seal-certification
foreign-use-authentication
```

Each service should have:

```text
Service Definition
Input Schema
Fee Rule
Calculation Function
Validation
Tests
```

---

# 31. DOCUMENTS / ATTACHMENTS

The reference UI includes documents and evidence.

Production architecture:

```text
Browser
 ↓
Upload API
 ↓
Object Storage
 ↓
Metadata DB
```

Do not store large binary files directly in the main relational tables unless there is a documented reason.

Security requirements:

```text
File type validation
Size limit
Content inspection
Malware scanning where required
Private storage
Signed/authorized download
Audit
```

---

# 32. DASHBOARD

The dashboard should distinguish:

```text
Assessment
Collection
Outstanding
Collection Rate
```

The existing project uses:

```text
collection_events
```

Current/demo data must be explicitly marked as demo until a real source is connected.

Never display simulated data as real operational data.

---

# 33. SECURITY ARCHITECTURE

Use a security baseline based on:

```text
OWASP ASVS
```

OWASP ASVS provides a structured basis for testing application security controls and secure-development requirements. citeturn0search0

Minimum areas:

```text
Authentication
Authorization
Session Security
Input Validation
Output Encoding
CSRF
CORS
CSP
Security Headers
Rate Limiting
Secrets
Encryption
Audit
Logging
File Upload Security
Database Security
Error Handling
Dependency Security
Backup Security
```

---

# 34. PERSONAL DATA

The reference screens contain sensitive-looking data such as:

```text
National ID
Names
Addresses
Case information
Financial values
Legal documents
```

Treat this as sensitive data.

Principles:

```text
Data minimization
Least privilege
Purpose limitation
Encryption in transit
Encryption at rest where required
Access logging
Retention policy
Secure deletion according to policy
```

Do not expose sensitive values in:

```text
console.log
client analytics
error messages
URLs
unprotected exports
```

---

# 35. SECURITY INCIDENTS

The security screens `_1` and `_2` are concepts.

Implement real events only where backend support exists.

Example:

```text
AUTH_FAILURE
PRIVILEGE_DENIED
SESSION_REVOKED
RULE_PUBLISH_ATTEMPT
UNAUTHORIZED_EXPORT
SIGNING_PROVIDER_FAILURE
```

Create structured security logs.

Do not fabricate:

```text
ITIDA status
Gov-PKI status
Live court connectivity
Federal encryption status
```

unless actually connected.

---

# 36. ITIDA / DIGITAL SIGNATURE

The reference design shows ITIDA and electronic-signature concepts.

Production implementation should be:

```text
SigningService
```

with an adapter.

```text
SigningService
 ├── MockSigningService
 └── ProductionSigningService
```

Production provider details must be supplied by the actual organization.

Do not hardcode fake certificate validation.

---

# 37. GEO-FENCING

The reference design mentions:

```text
Session & Geo-fencing
```

Do not add arbitrary location tracking.

If the organization actually requires location restrictions, define:

```text
Allowed Network
VPN
IP ranges
Device posture
Location policy
```

and implement server-side policy enforcement.

Never use browser GPS as a substitute for institutional network security.

---

# 38. PRODUCTION OBSERVABILITY

Use structured logs and traces.

OpenTelemetry provides vendor-neutral instrumentation for traces, metrics, and logs. citeturn0search1turn0search19

Recommended signals:

```text
Metrics
Logs
Traces
```

Important metrics:

```text
API latency
5xx rate
4xx rate
Calculation latency
Calculation failures
Rule resolution failures
Database latency
Queue latency
Login failures
Authorization failures
Review queue size
```

Do not log sensitive case data unnecessarily.

---

# 39. ERROR HANDLING

Frontend should receive safe structured errors:

```json
{
  "code": "CASE_TYPE_FACTS_REQUIRED",
  "message": "Required case facts are missing."
}
```

Never return:

```text
stack traces
SQL errors
secret values
internal filesystem paths
```

The existing project has error codes such as:

```text
UNKNOWN_CASE_TYPE
CASE_TYPE_VALUE_KIND_MISMATCH
CASE_TYPE_COURT_LEVEL_UNSUPPORTED
CASE_TYPE_FACTS_REQUIRED
CASE_TYPE_LEGAL_REVIEW_REQUIRED
FINAL_OUTCOME_REQUIRED
FINAL_TIMING_REQUIRED
FINAL_CLAIMS_LIMIT_EXCEEDED
RULE_CHANGE_SCOPE_FORBIDDEN
RULE_CHANGE_NOT_APPROVED
RULE_CHANGE_PUBLISH_FORBIDDEN
RULE_CHANGE_SELF_REVIEW_FORBIDDEN
RULE_PARAMETERS_INVALID
MANUAL_EXEMPTION_DISABLED
```

Preserve this philosophy.

---

# 40. API DESIGN

Use predictable REST conventions.

Example:

```text
GET    /api/cases
POST   /api/cases
GET    /api/cases/:id
PATCH  /api/cases/:id

POST   /api/calculations
GET    /api/calculations/:id
POST   /api/calculations/:id/submit-review
POST   /api/calculations/:id/approve
POST   /api/calculations/:id/return

GET    /api/rules
GET    /api/rules/:id
POST   /api/rules
POST   /api/rules/:id/revisions
POST   /api/rule-change-requests/:id/review
POST   /api/rule-change-requests/:id/publish

GET    /api/audit
GET    /api/dashboard
```

Preserve existing endpoints when practical.

Do not break existing clients unnecessarily.

---

# 41. API CONTRACTS

Create explicit DTOs:

```text
CreateCaseRequest
CaseResponse
CalculateRequest
CalculationResponse
CreateRuleRequest
RuleResponse
ReviewRequest
ReviewResponse
AuditEventResponse
```

Avoid returning raw database rows.

---

# 42. REPOSITORY LAYER

Recommended:

```text
repositories/
├── case.repository.ts
├── estimate.repository.ts
├── rule.repository.ts
├── audit.repository.ts
├── user.repository.ts
└── service-estimate.repository.ts
```

Interfaces should represent business needs, not SQL implementation details.

---

# 43. APPLICATION SERVICES

Create application services around workflows:

```text
CreateCaseService
CalculateFeesService
SubmitForReviewService
ApproveCalculationService
ReturnCalculationService
CreateRuleChangeService
ReviewRuleChangeService
PublishRuleService
```

This prevents routes from becoming huge.

---

# 44. DOMAIN SERVICES

Keep pure business logic here:

```text
CaseProfileResolver
EffectiveRuleResolver
FeeTreatmentResolver
FeeCalculator
ServiceFeeCalculator
ClaimValueCalculator
AccrualCalculator
GovernancePolicy
```

---

# 45. FRONTEND ARCHITECTURE

Recommended:

```text
src/
├── app/
├── components/
├── features/
│   ├── auth/
│   ├── cases/
│   ├── calculations/
│   ├── services/
│   ├── rules/
│   ├── review/
│   ├── audit/
│   ├── dashboard/
│   └── administration/
├── pages/
├── layouts/
├── services/
├── hooks/
├── context/
├── domain/
├── utils/
└── styles/
```

Feature-first organization is recommended for the growing UI.

---

# 46. DESIGN SYSTEM

Use the supplied `DESIGN.md` as the visual source.

## Primary palette

```text
Sovereign Navy:
#0F172A

Sovereign Gold:
#C59B27

Gold Dark:
#9B771A

Judicial Cobalt:
#1E3A8A

Canvas:
#F8FAFC

White:
#FFFFFF

Border:
#E2E8F0

Strong Border:
#CBD5E1
```

Status:

```text
Verified:
#14532D / #F0FDF4

Return:
#881337 / #FFF1F2

Pending:
#854D0E / #FEFCE8

Derivation:
#1E40AF / #EFF6FF
```

---

# 47. TYPOGRAPHY

Primary:

```text
IBM Plex Sans Arabic
```

Use:

```text
RTL
```

throughout the application.

Financial numbers should use consistent tabular numeric presentation.

Do not shrink text to solve layout problems.

Use:

```text
progressive disclosure
tabs
accordions
responsive grids
```

instead.

---

# 48. RTL LAYOUT

Global:

```html
<html lang="ar" dir="rtl">
```

Use RTL-native layout logic.

Do not randomly reverse margins and paddings.

Use:

```text
logical CSS properties
```

where possible:

```text
margin-inline
padding-inline
inset-inline
border-inline
```

---

# 49. MAIN SHELL

Reference design:

```text
Right Sidebar
+
Main Operational Canvas
```

Sidebar:

```text
~280px desktop
```

Main canvas:

```text
max-width around 1600px
```

Main sequence:

```text
Breadcrumb
 ↓
Action Header
 ↓
Workflow Stepper
 ↓
Operational Content
 ↓
Action Docket
```

---

# 50. RESPONSIVE DESIGN

Desktop:

```text
1280+
12-column layout
```

Compact desktop/tablet landscape:

```text
1024–1279
8-column layout
```

Tablet/mobile:

```text
<1024
4-column conceptual layout
Sidebar → Drawer
Stepper → numbered workflow
```

Avoid nested horizontal/vertical scroll traps.

---

# 51. COMPONENT LIBRARY

Create reusable components:

```text
AppShell
Sidebar
TopBar
Breadcrumbs
PageHeader
WorkflowStepper
StatusBadge
VerifiedStamp
DataCard
FormSection
FormField
SearchBar
FilterBar
DataTable
Pagination
Modal
Drawer
ConfirmDialog
EmptyState
ErrorState
LoadingState
AuditTimeline
RuleCard
FeeLineTable
CalculationProof
LegalCitation
ApprovalPanel
ReviewDecisionPanel
```

---

# 52. CALCULATION UI COMPONENTS

Create:

```text
CaseFactsPanel
DerivedValuesPanel
RulePanel
StatutoryGatePanel
ComputationTrail
FeeLinesTable
CalculationSummary
WarningsPanel
SourcesPanel
```

This should mirror the Domain architecture.

---

# 53. TABLE DESIGN

Use tables for:

```text
Cases
Calculations
Rules
Users
Audit Events
Review Queue
Approvals
```

Requirements:

```text
Readable
Sortable where meaningful
Filterable
Keyboard accessible
Responsive
No tiny text
```

---

# 54. ACCESSIBILITY

Target:

```text
WCAG 2.2 AA
```

Minimum:

```text
Keyboard navigation
Focus visibility
ARIA labels
Semantic HTML
Contrast
Error association
Form labels
Screen-reader-friendly status
Reduced motion
```

Status cannot rely on color alone.

---

# 55. PRINT / PDF

The reference designs heavily use:

```text
Print
PDF
Official Order
Audit Report
```

Build print-friendly views.

Do not use screenshots as PDFs.

Create semantic printable layouts.

For official documents, preserve:

```text
Case Number
Calculation ID
Rule Version
Legal Source
Total
Approval Status
Reviewer
Timestamp
Verification ID
```

---

# 56. EXPORTS

Exports should be permission-controlled.

Potential formats:

```text
PDF
Excel
CSV
JSON Safe Draft
```

Every export of sensitive information should be audited.

---

# 57. DOCUMENT VERSIONING

Every important artifact should have:

```text
version
createdAt
createdBy
status
checksum where appropriate
```

Never overwrite legal/rule history.

---

# 58. SECURITY / PRODUCTION CONFIGURATION

Use environment variables for:

```text
DATABASE_URL
JWT_SECRET / OIDC configuration
OIDC_CLIENT_ID
OIDC_CLIENT_SECRET
OIDC_ISSUER
STORAGE configuration
SIGNING provider configuration
CORS origins
RATE LIMITS
LOG level
```

Never commit secrets.

---

# 59. CONTENT SECURITY

Production should include:

```text
HTTPS
HSTS
CSP
X-Content-Type-Options
Referrer-Policy
Frame protection
Secure cookies
```

Tune CSP to the actual application.

Do not blindly copy a restrictive CSP that breaks fonts/assets.

---

# 60. CORS

Use an allowlist.

Never:

```text
Access-Control-Allow-Origin: *
```

for authenticated sensitive production APIs.

---

# 61. RATE LIMITING

Apply global limits and stricter limits for:

```text
Login
Password/identity attempts
Exports
Rule publishing
File uploads
Search-heavy endpoints
```

---

# 62. DATABASE SECURITY

Production PostgreSQL:

```text
Least-privilege DB user
Encrypted connection
Backups
Migration system
Connection pooling
Monitoring
```

Do not let application code run arbitrary SQL from user input.

---

# 63. MIGRATIONS

Use versioned migrations.

Example:

```text
001_initial
002_cases
003_rules
004_audit
005_reviews
006_documents
```

Never edit production schema manually without a migration record.

---

# 64. DATABASE TRANSACTIONS

Operations like:

```text
Approve Calculation
Publish Rule
Create Estimate + Audit
Return Calculation
```

should be transactional where multiple writes must succeed together.

Example:

```text
BEGIN
 ↓
Update Calculation
 ↓
Create Review Decision
 ↓
Create Audit Event
 ↓
COMMIT
```

If one fails:

```text
ROLLBACK
```

---

# 65. IDEMPOTENCY

Important operations should be safe against duplicate requests.

Examples:

```text
Publish Rule
Approve Calculation
Create Payment/Collection Event
Export Job
```

Use idempotency keys where appropriate.

---

# 66. CONCURRENCY

Prevent:

```text
Two reviewers approve the same calculation
Two publishers publish the same rule
Two users overwrite the same draft
```

Use:

```text
optimistic locking
version column
transaction checks
```

Example:

```text
recordVersion
```

---

# 67. AUDIT INTEGRITY

Audit event creation must occur server-side.

Do not trust:

```text
actorId from browser
role from browser
timestamp from browser
```

Derive identity from the authenticated server session/token.

---

# 68. RULE SECURITY

Only authorized users can:

```text
Create Rule
Edit Draft
Submit Review
Approve
Publish
```

The browser must never decide that the user has permission.

---

# 69. LEGAL DATA SAFETY

Legal sources must be first-class records.

Example:

```text
LegalSource
 ├── id
 ├── title
 ├── sourceType
 ├── referenceNumber
 ├── publicationDate
 ├── officialUrl/document
 ├── article
 └── checksum
```

Do not hardcode legal articles in UI text.

---

# 70. LEGAL RULE CONTENT

The Stitch screens contain examples of:

```text
Law number
Ministerial decisions
Official Gazette
Legal articles
```

These must be treated as **reference content only** until verified.

Codex must not invent or silently validate legal claims.

Create seed/demo records clearly marked:

```text
DEMO
```

or:

```text
UNVERIFIED
```

until official sources are supplied.

---

# 71. NO FAKE INTEGRATIONS

Never implement fake claims such as:

```text
Connected to Ministry system
Connected to ITIDA
Connected to Gov-PKI
Live court records
Live collection system
Live electronic docket
```

unless there is a real integration.

Instead:

```text
Integration Adapter
+
Mock Adapter
+
Clear Demo Mode
```

---

# 72. DEMO MODE

Create a visible technical configuration:

```text
APP_MODE=development
```

or:

```text
DEMO_MODE=true
```

Demo mode must never look like production live data without an explicit indicator.

---

# 73. ENVIRONMENTS

Use:

```text
development
test
staging
production
```

Each environment has separate:

```text
Database
Secrets
Identity Provider
Storage
Logs
External Integrations
```

---

# 74. CI/CD

Recommended pipeline:

```text
Install
 ↓
Lint
 ↓
Typecheck
 ↓
Unit Tests
 ↓
Integration Tests
 ↓
Build
 ↓
Security Audit
 ↓
E2E
 ↓
Container Build
 ↓
Deploy Staging
 ↓
Smoke Tests
 ↓
Manual Approval
 ↓
Production
```

Do not deploy if:

```text
Typecheck fails
Tests fail
Build fails
Critical security checks fail
Database migration fails
```

---

# 75. TESTING STRATEGY

## Unit Tests

Focus on:

```text
Money
Progressive fees
Rule resolution
Fee treatment
Case profiles
Claim values
Accruals
Governance
Permissions
```

## Integration Tests

Test:

```text
API
Database
Repositories
Authentication
Authorization
Transactions
```

## E2E

Use a browser automation tool such as:

```text
Playwright
```

Test:

```text
Login
Create Case
Enter Facts
Calculate
Submit Review
Approve
View Audit
Search History
Create Rule Draft
Review Rule
Publish Rule
```

---

# 76. GOLDEN CALCULATION TESTS

For a legal/financial engine, create a set of approved reference scenarios.

Each scenario contains:

```text
Input
Expected Rule
Expected Treatment
Expected Derived Values
Expected Fee Lines
Expected Total
Expected Warnings
```

These are the highest-value regression tests.

Never change a golden expected result merely to make a test pass.

If the legal rule changes:

```text
Create New Rule Version
Update Golden Case
Record Reason
```

---

# 77. PROPERTY / EDGE TESTS

Test:

```text
0
negative values
very large values
boundary values
minimum
maximum
exact bracket boundaries
one millieme above boundary
one millieme below boundary
unknown value
missing facts
invalid court
unsupported court level
exempt case
reduced case
review-required case
```

---

# 78. VISUAL REGRESSION

The Stitch screens should be treated as visual references.

Create screenshots for:

```text
Login
Dashboard
Case List
New Case
Case Facts
Claim Value
Calculation
Result
Review
Rules
Audit
Users
Security
```

Compare visually during implementation.

Do not require pixel-perfect reproduction if it harms:

```text
Accessibility
Responsive behavior
Maintainability
Real data density
```

---

# 79. PERFORMANCE TARGETS

Establish measurable budgets.

Examples:

```text
Fast initial load
No unnecessary JS
Lazy-load heavy pages
Paginate large tables
Server-side filtering
Debounce search
Avoid N+1 queries
Cache stable catalog data
```

Do not optimize blindly.

Measure first.

---

# 80. SERVER-SIDE PAGINATION

Do not load thousands of:

```text
cases
audit events
calculations
users
rules
```

into the browser.

Use:

```text
page
pageSize
sort
filters
```

with safe maximums.

---

# 81. SEARCH

Search must be:

```text
Debounced
Server-side for large datasets
Parameterized
Permission-aware
```

Potential searchable fields:

```text
Case Number
Document Number
Party Name
Rule ID
Calculation ID
User
Audit Event ID
```

Do not expose records the user cannot access.

---

# 82. NOTIFICATIONS

The reference UI includes notifications.

Create:

```text
NotificationService
```

Events:

```text
Calculation Returned
Calculation Approved
Rule Approved
Rule Published
Security Alert
Integration Failure
Review Assignment
```

---

# 83. ROLE-BASED WORKFLOWS

## Estimator

```text
Login
 ↓
Dashboard
 ↓
Create / Open Case
 ↓
Enter Facts
 ↓
Determine Claim Value
 ↓
Classification
 ↓
Calculate
 ↓
Review Result
 ↓
Submit for Review
```

---

## Supervisor

```text
Login
 ↓
Dashboard
 ↓
Review Calculations
 ↓
Compare Versions
 ↓
Inspect Rule / Evidence
 ↓
Approve
or
Return
```

---

## Legal Reviewer

```text
Login
 ↓
Rule Queue
 ↓
Open Rule Change
 ↓
Inspect Legal Source
 ↓
Review Parameters
 ↓
Approve / Reject
```

---

## Project Manager

```text
Login
 ↓
Governance
 ↓
Approved Rule Changes
 ↓
Publish
 ↓
Effective Date
 ↓
Audit
```

---

## Leader

```text
Login
 ↓
Dashboard
 ↓
Operational Metrics
 ↓
Collection
 ↓
Review Workload
 ↓
Audit / Reports
```

---

# 84. SYSTEM ADMINISTRATOR

Capabilities should be permission-based.

Typical:

```text
Users
Roles
Security
Configuration
Integration status
Audit
Operational health
```

Do not grant calculation-rule publication merely because a user is an administrator.

Use explicit permissions.

---

# 85. CASE WORKFLOW — FULL

```text
1. Login
      ↓
2. Open Dashboard
      ↓
3. Create Case
      ↓
4. Select Court
      ↓
5. Select Case Type
      ↓
6. Select Court Level
      ↓
7. Enter Parties
      ↓
8. Enter Facts
      ↓
9. Enter Requests
      ↓
10. Determine Claim Value
      ↓
11. Legal Classification
      ↓
12. Resolve Effective Rule
      ↓
13. Resolve Fee Treatment
      ↓
14. Calculate
      ↓
15. Explain Result
      ↓
16. Save Estimate
      ↓
17. Submit Review
      ↓
18. Reviewer Decision
      ├── Return
      └── Approve
             ↓
19. Issue Final Record
      ↓
20. Audit
```

---

# 86. CALCULATION WORKFLOW — BACKEND

```text
HTTP Request
 ↓
Authenticate
 ↓
Authorize
 ↓
Validate DTO
 ↓
Load Catalog
 ↓
Resolve Case Profile
 ↓
Validate Profile Constraints
 ↓
Resolve Effective Rule
 ↓
Resolve Fee Treatment
 ↓
Validate Required Facts
 ↓
Calculate Claim Basis
 ↓
Calculate Progressive Components
 ↓
Apply Caps / Fixed Fees
 ↓
Calculate Final Claims
 ↓
Calculate Accruals
 ↓
Build Fee Lines
 ↓
Build Computation Trail
 ↓
Build Legal Sources
 ↓
Build Warnings
 ↓
Persist Estimate
 ↓
Persist Audit
 ↓
Return Result
```

---

# 87. SAFE FAILURE

In this system:

```text
Wrong Number
```

is worse than:

```text
Review Required
```

Therefore, when required legal facts are missing:

```text
Do not guess.
Do not silently use defaults.
Return an explicit error/review state.
```

---

# 88. ERROR STATES

Examples:

```text
UNKNOWN_CASE_TYPE
CASE_TYPE_VALUE_KIND_MISMATCH
CASE_TYPE_COURT_LEVEL_UNSUPPORTED
CASE_TYPE_FACTS_REQUIRED
CASE_TYPE_LEGAL_REVIEW_REQUIRED
FINAL_OUTCOME_REQUIRED
FINAL_TIMING_REQUIRED
FINAL_CLAIMS_LIMIT_EXCEEDED
RULE_CHANGE_SCOPE_FORBIDDEN
RULE_CHANGE_NOT_APPROVED
RULE_CHANGE_PUBLISH_FORBIDDEN
RULE_CHANGE_SELF_REVIEW_FORBIDDEN
RULE_PARAMETERS_INVALID
MANUAL_EXEMPTION_DISABLED
```

Map them to user-friendly Arabic messages without leaking internals.

---

# 89. DATA FLOW

## Frontend

```text
Page
 ↓
Feature Hook
 ↓
API Service
 ↓
HTTP
```

## Backend

```text
Route
 ↓
DTO Validation
 ↓
Application Service
 ↓
Domain
 ↓
Repository
 ↓
Database
```

---

# 90. DEPENDENCY RULE

Preferred dependency direction:

```text
UI
 ↓
Application/API
 ↓
Domain
 ↓
Infrastructure
```

Not:

```text
Domain
 ↓
React
```

and not:

```text
Domain
 ↓
SQLite
```

---

# 91. WHAT CODEX MUST NOT DO

Do not:

```text
- Replace the project concept.
- Rewrite the calculation engine without evidence.
- Move business rules into React.
- Hardcode legal rules in JSX.
- Hardcode fake government integrations.
- Store secrets in source code.
- Use localStorage for sensitive long-lived tokens without a documented reason.
- Trust role values supplied by the browser.
- Allow client-side approval.
- Allow historical calculations to change silently.
- Delete audit history.
- Use floating point for financial calculations.
- Create fake "live" collection data.
- Claim official certification.
- Invent legal articles.
- Create Microservices just for architectural fashion.
- Add Redux/Redis/queues without a real requirement.
- Copy CDN-only reference HTML into production.
```

---

# 92. IMPLEMENTATION ORDER

## Phase 1 — Audit

Inspect:

```text
Existing source
package.json
Domain
API
Database
Tests
Stitch ZIP
DESIGN.md
Logo
```

Produce:

```text
docs/implementation-audit.md
```

---

## Phase 2 — Architecture Freeze

Document:

```text
Domain
Entities
Roles
Permissions
State machines
API contracts
Database model
```

No UI polishing yet.

---

## Phase 3 — Design System

Implement:

```text
Colors
Typography
RTL
Spacing
Buttons
Inputs
Cards
Tables
Status
Dialogs
```

---

## Phase 4 — Application Shell

Build:

```text
Login
Sidebar
Topbar
Breadcrumbs
Routing
Responsive layout
```

---

## Phase 5 — Case Management

Build:

```text
Case List
Create Case
Case File
Facts
Requests
Documents
```

---

## Phase 6 — Calculation Workflow

Build:

```text
Claim Value
Classification
Calculation Processing
Calculation Result
History
Archived Record
```

---

## Phase 7 — Review

Build:

```text
Review Queue
Review Workspace
Comparison
Approval
Return
Decision Register
```

---

## Phase 8 — Legal Rules

Build:

```text
Rule Registry
Rule Detail
Rule Editor
Version Tree
Rule Comparison
Legal Sources
Simulation
Governance
```

---

## Phase 9 — Audit / Administration

Build:

```text
Audit Log
Users
RBAC
Security
System Administration
```

---

## Phase 10 — Dashboard

Build:

```text
KPIs
Recent Calculations
Review Queue
Collection
Operational Alerts
```

---

## Phase 11 — Court Services

Build:

```text
Service Catalog
Service Forms
Service Calculation
Service Estimate
History
```

---

## Phase 12 — Security

Implement:

```text
Production Auth
RBAC
Secure Session
CSP
Headers
Rate Limits
Audit
Secrets
Data protection
```

---

## Phase 13 — Testing

Implement:

```text
Unit
Integration
API
E2E
Visual
Security
Golden Calculations
```

---

## Phase 14 — Production

Implement:

```text
PostgreSQL
Migrations
Object Storage
OIDC
Monitoring
Logging
Tracing
Backups
CI/CD
Staging
Deployment
```

---

# 93. RECOMMENDED PROJECT COMMANDS

Keep the existing package manager:

```text
pnpm
```

Core commands should include equivalents of:

```bash
pnpm dev
pnpm build
pnpm test
pnpm typecheck
```

Add when appropriate:

```bash
pnpm lint
pnpm test:e2e
pnpm test:visual
pnpm db:migrate
pnpm db:seed
```

---

# 94. ENVIRONMENT VARIABLES

Create a documented `.env.example`.

Never include real secrets.

Example:

```env
NODE_ENV=development
APP_MODE=demo

DATABASE_URL=

OIDC_ISSUER=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=

SESSION_SECRET=

CORS_ORIGINS=

OBJECT_STORAGE_ENDPOINT=
OBJECT_STORAGE_BUCKET=

LOG_LEVEL=info
```

---

# 95. DEPLOYMENT ARCHITECTURE

Recommended conceptual deployment:

```text
Internet / Institutional Network
             │
             ▼
        Load Balancer
             │
             ▼
          Web/API
             │
       ┌─────┴─────┐
       ▼           ▼
   PostgreSQL   Object Storage
       │
       ▼
    Backups

Observability:
Web/API → OTel → Collector → Monitoring
```

Do not assume a cloud vendor until deployment constraints are known.

---

# 96. BACKUP / DISASTER RECOVERY

Production must define:

```text
RPO
RTO
Backup frequency
Retention
Restore testing
Offsite copy
Encryption
Access control
```

A backup that has never been restored is not a proven recovery strategy.

---

# 97. DATABASE AVAILABILITY

Production PostgreSQL should be designed for the expected availability requirement.

Potential capabilities:

```text
Automated backups
Point-in-time recovery
Replication
Failover
Connection pooling
Health checks
```

Do not over-engineer HA before the actual infrastructure requirement is known.

---

# 98. OBSERVABILITY DASHBOARD

Create technical dashboards for:

```text
Requests
Errors
Latency
Database
Calculations
Authentication
Authorization
Rules
Review Queue
External Integrations
```

Separate:

```text
Technical Observability
```

from:

```text
Business Dashboard
```

---

# 99. HEALTH ENDPOINTS

Keep:

```text
GET /api/health
```

Consider:

```text
GET /api/health/live
GET /api/health/ready
```

Definitions:

```text
liveness = process is alive
readiness = dependencies are ready
```

Do not expose sensitive dependency information publicly.

---

# 100. SECURITY CHECKLIST

Before Production:

```text
[ ] HTTPS
[ ] Secure cookies
[ ] CSRF strategy
[ ] CORS allowlist
[ ] CSP
[ ] Security headers
[ ] Rate limiting
[ ] Authentication
[ ] MFA where required
[ ] RBAC
[ ] Server-side authorization
[ ] Input validation
[ ] Output encoding
[ ] SQL injection protection
[ ] File upload controls
[ ] Secret management
[ ] Audit
[ ] Dependency scanning
[ ] Container scanning if containerized
[ ] Backup encryption
[ ] Database least privilege
[ ] PII minimization
[ ] Security incident logging
```

---

# 101. QA ACCEPTANCE CRITERIA

The website is not considered complete because:

```text
"the page looks right"
```

It is complete only when:

```text
UI works
+
API works
+
Domain works
+
Database works
+
Authorization works
+
Audit works
+
Tests pass
+
Security checks pass
+
Production build succeeds
```

---

# 102. FEATURE DEFINITION OF DONE

Every feature must have:

```text
[ ] Requirement
[ ] UX
[ ] Domain model
[ ] API contract
[ ] Validation
[ ] Authorization
[ ] Persistence if required
[ ] Audit impact
[ ] Error states
[ ] Loading states
[ ] Empty states
[ ] Tests
[ ] Accessibility
[ ] Responsive behavior
[ ] Documentation
```

---

# 103. CASE FEATURE DEFINITION OF DONE

```text
[ ] Create case
[ ] Edit draft
[ ] Validate court
[ ] Validate case type
[ ] Validate required facts
[ ] Save
[ ] Audit
[ ] View case
[ ] Search
[ ] Filter
[ ] Permissions
```

---

# 104. CALCULATION FEATURE DEFINITION OF DONE

```text
[ ] Input validated
[ ] Case profile resolved
[ ] Effective rule resolved
[ ] Fee treatment resolved
[ ] Claim basis calculated
[ ] Fees calculated
[ ] Fee lines generated
[ ] Computation trail generated
[ ] Legal sources generated
[ ] Warnings generated
[ ] Result persisted
[ ] Audit persisted
[ ] Golden tests pass
```

---

# 105. RULE FEATURE DEFINITION OF DONE

```text
[ ] Draft
[ ] Legal source
[ ] Version
[ ] Effective date
[ ] Scope
[ ] Parameters
[ ] Validation
[ ] Review
[ ] Approval
[ ] Publication
[ ] Audit
[ ] Historical protection
[ ] Simulation
```

---

# 106. REVIEW FEATURE DEFINITION OF DONE

```text
[ ] Queue
[ ] Assignment
[ ] Open calculation
[ ] Compare versions
[ ] Inspect facts
[ ] Inspect legal basis
[ ] Inspect computation
[ ] Approve
[ ] Return
[ ] Audit
[ ] Permission checks
```

---

# 107. VISUAL IMPLEMENTATION RULE

Use the Stitch screens as the target for:

```text
Hierarchy
Spacing
Color
RTL
Navigation
Density
Terminology
Workflow
```

But production implementation must improve:

```text
Semantics
Accessibility
Responsiveness
Security
Maintainability
Real data handling
```

Do not simply paste each HTML screen into the project.

Extract reusable components.

---

# 108. DESIGN TOKENS

Create one source of truth.

Example:

```ts
const tokens = {
  colors: {
    sovereignNavy: '#0F172A',
    sovereignGold: '#C59B27',
    goldDark: '#9B771A',
    cobalt: '#1E3A8A',
    canvas: '#F8FAFC',
    white: '#FFFFFF',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
};
```

Do not duplicate magic values across dozens of components.

---

# 109. FORM DESIGN

Every field needs:

```text
Label
Help text when needed
Input
Validation
Error message
Required state
Accessible association
```

Financial fields:

```text
Currency
Unit
Precision
Range
```

must be explicit.

---

# 110. LEGAL EXPLANATION UI

Never show:

```text
Total: 5,000 EGP
```

alone.

Prefer:

```text
إجمالي الرسوم المستحقة
5,000 جنيه مصري

القاعدة المطبقة:
RULE-XXXX / Version X

الوعاء:
...

المعاملة:
...

الحساب:
...

السند:
...

الحالة:
مراجعة / معتمد
```

---

# 111. NOTIFICATION DESIGN

Notifications must contain:

```text
What happened
When
What entity
What action is available
```

Example:

```text
تم إرجاع حساب الرسوم رقم CAL-2026-0012 للمراجعة.
السبب: نقص واقعة مطلوبة.
```

---

# 112. AUDIT TIMELINE DESIGN

Display:

```text
Timestamp
Actor
Role
Action
Entity
Status
Verification
```

For example:

```text
10:32
المراجع المالي
مراجعة الحساب
CAL-00012
تم التحقق
```

---

# 113. OFFICIAL DOCUMENT DESIGN

The logo can appear in:

```text
Header
Official record
Printable report
```

But do not use official-looking seals or phrases to imply certification that does not exist.

---

# 114. CONTENT POLICY FOR THE PRODUCT

The interface should use clear institutional Arabic.

Avoid marketing language.

Avoid:

```text
AI magic
instant guaranteed approval
100% official
live government connected
```

unless those claims are true and verified.

---

# 115. IMPLEMENTATION RULE FOR CODEX

When implementing a page:

1. Find the corresponding Stitch reference.
2. Understand its workflow.
3. Identify reusable UI.
4. Identify required Domain data.
5. Identify API needs.
6. Implement backend contract first when business logic is involved.
7. Implement frontend.
8. Add loading/error/empty states.
9. Add authorization.
10. Add tests.
11. Compare visually.
12. Refactor duplicated code.

---

# 116. CODE QUALITY

Require:

```text
Strict TypeScript
No unnecessary any
Small functions
Clear names
No duplicated business logic
No business logic in JSX
No SQL in React
No hidden side effects
No giant route handlers
No giant components
```

---

# 117. LOGGING

Use structured logging.

Example:

```json
{
  "event": "calculation.completed",
  "calculationId": "CAL-123",
  "durationMs": 42,
  "ruleVersion": "4.19",
  "status": "success"
}
```

Do not log:

```text
National ID
Full legal documents
Passwords
Tokens
Secrets
Sensitive financial details
```

unless explicitly required and protected.

---

# 118. API PERFORMANCE

Avoid:

```text
N+1
Large unbounded responses
Repeated catalog queries
Repeated rule resolution
```

Potential caching targets:

```text
Catalog
Published rule metadata
Static legal source metadata
```

Do not cache mutable authorization decisions blindly.

---

# 119. CACHING

Start simple.

Potential:

```text
In-memory / HTTP caching
```

Later if required:

```text
Redis
```

Do not add Redis solely because it is a common production technology.

---

# 120. BACKGROUND JOBS

Use a queue only when there is a real asynchronous workload.

Potential jobs:

```text
Large export
PDF generation
Document scanning
Notification delivery
External integration retry
Audit package generation
```

Do not introduce a queue for ordinary calculation requests.

---

# 121. MODULARITY WITHOUT MICROSERVICES

Organize the backend into modules:

```text
modules/
├── auth/
├── cases/
├── calculations/
├── rules/
├── services/
├── review/
├── audit/
├── dashboard/
└── administration/
```

A modular monolith can later extract a module if justified.

---

# 122. MIGRATION FROM CURRENT PROJECT

Do not perform a big-bang rewrite.

Recommended:

```text
Current Project
      ↓
Add Tests
      ↓
Extract Interfaces
      ↓
Add Repositories
      ↓
Refactor Routes
      ↓
Add Feature Modules
      ↓
Improve UI
      ↓
Harden Security
      ↓
Production Infrastructure
```

Keep the existing calculation engine protected by regression tests.

---

# 123. FIRST IMPLEMENTATION SPRINT

The first sprint should not attempt the whole website.

Do:

```text
1. Audit current source
2. Inventory all routes
3. Inventory domain functions
4. Inventory DB tables
5. Add/verify calculation tests
6. Build design tokens
7. Build AppShell
8. Build Login
9. Build Dashboard shell
10. Build Case List shell
```

Output:

```text
Stable Foundation
```

---

# 124. SECOND SPRINT

```text
Case Creation
 ↓
Facts
 ↓
Claim Value
 ↓
Classification
```

---

# 125. THIRD SPRINT

```text
Calculation Engine integration
 ↓
Processing state
 ↓
Explainable result
 ↓
Estimate persistence
```

---

# 126. FOURTH SPRINT

```text
Review Queue
 ↓
Review Workspace
 ↓
Approval
 ↓
Return
 ↓
Comparison
```

---

# 127. FIFTH SPRINT

```text
Rule Registry
 ↓
Rule Detail
 ↓
Rule Draft
 ↓
Legal Review
 ↓
Publish
 ↓
Effective Date
```

---

# 128. SIXTH SPRINT

```text
Audit
 ↓
Users
 ↓
RBAC
 ↓
Security
 ↓
Dashboard
```

---

# 129. SEVENTH SPRINT

```text
Court Services
 ↓
Documents
 ↓
Exports
 ↓
Print
```

---

# 130. EIGHTH SPRINT

```text
E2E
 ↓
Visual Regression
 ↓
Security Testing
 ↓
Performance
 ↓
Production Deployment
```

---

# 131. PRODUCTION READINESS GATE

Before production, all must be true:

```text
[ ] Business rules verified
[ ] Legal sources verified
[ ] Calculation golden cases approved
[ ] Historical calculation freeze verified
[ ] RBAC verified
[ ] Authentication verified
[ ] Audit integrity verified
[ ] Database backups verified
[ ] Restore tested
[ ] Security review completed
[ ] E2E tests passing
[ ] No critical vulnerabilities
[ ] Monitoring active
[ ] Alerting active
[ ] Error tracking active
[ ] Production secrets configured
[ ] Staging smoke tests passed
[ ] Rollback plan documented
[ ] Incident response plan documented
```

---

# 132. ROLLBACK STRATEGY

Every production release must have:

```text
Version
Migration plan
Rollback consideration
Application rollback
Database rollback strategy
Feature flag strategy where appropriate
```

Do not assume database migrations are always safely reversible.

---

# 133. FEATURE FLAGS

Potential flags:

```text
newCalculationUI
newReviewFlow
oidcAuthentication
newRuleEngine
newDashboard
```

Use feature flags for risky migrations.

Do not hide security controls behind client-only feature flags.

---

# 134. DATA MIGRATION

If moving:

```text
SQLite → PostgreSQL
```

create:

```text
Export
Transform
Import
Validate
Reconcile
Cutover
```

Compare:

```text
record counts
checksums
sample records
calculation results
audit continuity
```

---

# 135. CALCULATION RECONCILIATION

Before production migration, run:

```text
Old Engine
      vs
New Engine
```

against the same golden dataset.

Required:

```text
Exact equality
```

or a formally documented expected difference.

No unexplained differences.

---

# 136. LEGAL RULE MIGRATION

For every rule:

```text
Old Version
New Version
Effective Date
Source
Parameters
Test Cases
Approval
```

Never migrate rules without provenance.

---

# 137. USER EXPERIENCE PRINCIPLE

The user is performing administrative/legal work.

The UI must prioritize:

```text
Accuracy
Clarity
Traceability
Low cognitive load
Fast scanning
Keyboard efficiency
```

not:

```text
Animations
Marketing effects
Decorative gradients
Excessive rounded cards
```

---

# 138. MOBILE

The primary users may be on desktop workstations.

Still make the system responsive.

Mobile should support:

```text
Review
Search
Status
Basic case inspection
```

Complex calculation forms may use step-based mobile layouts.

Do not simply shrink the desktop screen.

---

# 139. INTERNATIONALIZATION

Primary:

```text
Arabic
RTL
```

Architecture should still permit:

```text
English
LTR
```

later if needed.

Do not hardcode UI strings across JSX.

Use a centralized message layer if multilingual support is required.

---

# 140. DATE / NUMBER FORMATTING

Centralize:

```text
Currency
Dates
Case Numbers
IDs
Percentages
```

Never format financial values differently across screens.

---

# 141. CURRENCY

Default display:

```text
جنيه مصري
EGP
```

Use one formatter.

Example conceptual API:

```text
formatCurrency(amountMillieme)
```

---

# 142. DOCUMENT IDs

Use stable IDs.

Example:

```text
CASE-2026-000123
CAL-2026-000456
RULE-2026-000017
AUD-2026-000891
```

Do not use sequential database IDs as the only public identifier.

---

# 143. CORRELATION IDs

Every request should have a correlation ID.

Flow:

```text
Browser
 ↓
X-Request-ID
 ↓
API
 ↓
Logs
 ↓
Audit / tracing
```

This makes production troubleshooting much easier.

---

# 144. API SECURITY

Every protected endpoint must perform:

```text
Authentication
 ↓
Authorization
 ↓
Input validation
 ↓
Business validation
```

Do not rely on route naming or frontend visibility.

---

# 145. OBJECT-LEVEL AUTHORIZATION

It is not enough to check:

```text
user has role estimator
```

Also check:

```text
user may access THIS case
user may access THIS court
user may review THIS calculation
user may publish THIS rule
```

This prevents IDOR/BOLA-style problems.

---

# 146. AUDITABLE EXPORTS

When a user exports:

```text
Case
Calculation
Audit
Rule
User list
```

create an audit event:

```text
EXPORT_CREATED
```

Include:

```text
actor
resource
filter
timestamp
format
```

Do not store sensitive export contents in the audit table.

---

# 147. SECURITY ALERT WORKFLOW

```text
Security Event
 ↓
Risk classification
 ↓
Audit
 ↓
Notification
 ↓
Admin investigation
 ↓
Resolution
```

---

# 148. EXTERNAL INTEGRATION ARCHITECTURE

Use adapters:

```text
CourtRegistryProvider
IdentityProvider
SigningProvider
CollectionProvider
NotificationProvider
DocumentProvider
```

Implement:

```text
Mock
Real
```

separately.

---

# 149. EXTERNAL INTEGRATION FAILURE

Every external dependency needs:

```text
Timeout
Retry where safe
Circuit breaker where appropriate
Clear error
Audit
Fallback
```

Do not retry non-idempotent operations blindly.

---

# 150. TEST EXTERNAL INTEGRATIONS

Use contract tests.

Do not make the complete E2E suite dependent on a real external government service.

Have:

```text
Mock Provider
Contract Test
Staging Integration Test
Production Smoke Test
```

---

# 151. CODEX WORKING METHOD

For every task:

```text
1. Inspect
2. Plan
3. Change smallest safe surface
4. Test
5. Typecheck
6. Lint
7. Review diff
8. Verify behavior
```

Do not make huge unreviewable changes.

---

# 152. WHEN CODEX FINDS CONFLICTING LOGIC

Do not guess.

Example:

```text
Existing calculate.ts
vs
New UI requirement
```

First identify:

```text
Which one is business truth?
```

If unclear:

```text
Create a TODO / decision record
```

Do not silently change legal behavior.

---

# 153. DECISION RECORDS

Use:

```text
docs/adr/
```

Examples:

```text
ADR-001-modular-monolith.md
ADR-002-postgresql-production.md
ADR-003-oidc-authentication.md
ADR-004-financial-integer-arithmetic.md
ADR-005-rule-versioning.md
ADR-006-audit-hash-chain.md
```

---

# 154. DOCUMENTATION

Maintain:

```text
README.md
docs/architecture.md
docs/domain.md
docs/calculation-engine.md
docs/rules.md
docs/rbac.md
docs/security.md
docs/deployment.md
docs/testing.md
docs/adr/
```

---

# 155. FINAL TARGET REPOSITORY

Conceptually:

```text
project/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── pages/
│   ├── layouts/
│   ├── domain/
│   ├── services/
│   ├── hooks/
│   ├── context/
│   ├── utils/
│   └── styles/
│
├── server/
│   ├── routes/
│   ├── modules/
│   ├── repositories/
│   ├── middleware/
│   ├── infrastructure/
│   ├── auth/
│   └── index.ts
│
├── db/
│   ├── migrations/
│   └── seeds/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
│
├── docs/
│   ├── architecture.md
│   ├── domain.md
│   ├── rules.md
│   ├── security.md
│   ├── deployment.md
│   ├── testing.md
│   └── adr/
│
├── public/
│   └── branding/
│
├── package.json
├── pnpm-lock.yaml
├── .env.example
├── Dockerfile
├── docker-compose.dev.yml
└── README.md
```

---

# 156. FINAL MENTAL MODEL

If you need to remember only three diagrams:

## Application

```text
USER
 ↓
REACT
 ↓
API
 ↓
FASTIFY
 ↓
AUTH
 ↓
AUTHORIZATION
 ↓
VALIDATION
 ↓
APPLICATION SERVICE
 ↓
DOMAIN
 ↓
RULES
 ↓
CALCULATION
 ↓
REPOSITORY
 ↓
DATABASE
 ↓
AUDIT
 ↓
RESULT
```

## Calculation

```text
CASE
 ↓
CASE PROFILE
 ↓
EFFECTIVE RULE
 ↓
FEE TREATMENT
 ↓
CLAIM BASIS
 ↓
CALCULATION
 ↓
FEE LINES
 ↓
COMPUTATION TRAIL
 ↓
RESULT
```

## Governance

```text
RULE PROPOSAL
 ↓
LEGAL REVIEW
 ↓
APPROVAL
 ↓
PUBLICATION
 ↓
EFFECTIVE DATE
 ↓
CALCULATION ENGINE
```

---

# 157. FINAL TECHNOLOGY MATRIX

| Area | Current | Production Direction | Decision |
|---|---|---|---|
| UI | React | React | Keep |
| Language | TypeScript | TypeScript | Keep |
| Build | Vite | Vite | Keep |
| Routing | React Router | React Router | Keep |
| API | Fastify | Fastify | Keep |
| Validation | Zod | Zod + explicit API schemas | Keep |
| Auth | Demo JWT/JOSE | OIDC/SSO + secure session | Upgrade |
| DB | SQLite | PostgreSQL | Upgrade for production |
| State | React state/Context | Same initially | Keep |
| Server state | Fetch/useEffect | TanStack Query if needed | Optional |
| HTTP | Fetch | Fetch | Keep |
| Icons | Lucide / reference Material Symbols | Packaged icon system | Keep / optional |
| CSS | Existing + reference Tailwind | Local build/design system | Standardize |
| Testing | Vitest | Vitest + integration + E2E | Upgrade |
| E2E | — | Playwright | Add |
| Observability | Basic | OpenTelemetry | Add |
| Logs | Basic | Structured centralized logs | Upgrade |
| Queue | — | Only if needed | Optional |
| Cache | — | Only if needed | Optional |
| Storage | Local/reference | Object Storage | Production |
| Deployment | Local | Staging + Production | Add |
| Security | Basic controls | OWASP ASVS-oriented | Harden |

---

# 158. NON-NEGOTIABLE BUSINESS RULES

```text
1. The project remains a Judicial Fees System.
2. The calculation engine remains a Domain responsibility.
3. Legal rules are versioned.
4. Effective dates matter.
5. Historical calculations are frozen.
6. Fee treatment is explicit.
7. Exempt/reduced/review states are explicit.
8. Financial arithmetic is deterministic.
9. Review and approval are server-side.
10. Audit events are immutable/append-oriented.
11. Authorization is server-side.
12. Legal sources have provenance.
13. No invented legal rules.
14. No fake government integrations.
15. Demo data is labeled.
```

---

# 159. FINAL CODEX INSTRUCTION

After reading this file and the supplied reference ZIP/logo:

### Step 1
Inspect the existing repository.

### Step 2
Inspect all reference HTML/screenshots.

### Step 3
Create an implementation audit.

### Step 4
Create/update the architecture documentation.

### Step 5
Build the design system.

### Step 6
Build the application shell.

### Step 7
Implement the case workflow.

### Step 8
Integrate the calculation engine without changing its business meaning.

### Step 9
Implement explainability.

### Step 10
Implement review and governance.

### Step 11
Implement audit.

### Step 12
Implement administration/RBAC.

### Step 13
Implement court services.

### Step 14
Implement dashboard.

### Step 15
Add production authentication adapter.

### Step 16
Add production PostgreSQL adapter.

### Step 17
Add security hardening.

### Step 18
Add automated tests.

### Step 19
Run visual verification against the supplied Stitch screens.

### Step 20
Run:

```text
typecheck
lint
unit tests
integration tests
E2E
build
```

### Step 21
Fix all issues.

### Step 22
Produce:

```text
README
Architecture documentation
Deployment documentation
Security documentation
Test report
Known limitations
Production checklist
```

---

# 160. DEFINITION OF SUCCESS

The final product should feel like:

```text
A serious institutional judicial operations platform
```

not:

```text
A dashboard template
```

It should have:

```text
Institutional visual identity
+
Arabic-first RTL UX
+
Case workflow
+
Explainable calculations
+
Legal rule governance
+
Review workflow
+
Auditability
+
RBAC
+
Security
+
Production infrastructure
```

The system must be:

```text
Maintainable
Testable
Auditable
Explainable
Secure
Responsive
Accessible
Production-oriented
```

while preserving:

```text
THE ORIGINAL JUDICIAL FEES SYSTEM IDEA
```

---

# 161. REFERENCE SOURCES

Technical references used while preparing this production direction:

- Fastify validation and serialization documentation:
  https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/

- Fastify TypeScript documentation:
  https://fastify.dev/docs/latest/Reference/TypeScript/

- OpenID Connect specifications:
  https://openid.net/wg/connect/specifications/

- OWASP Application Security Verification Standard:
  https://owasp.org/projects/asvs

- OpenTelemetry documentation:
  https://opentelemetry.io/docs/

These are implementation references. They do not replace the project's actual legal, institutional, security, or infrastructure requirements.

---

# 162. FINAL RULE

**Do not optimize for "finishing pages".**

Optimize for:

```text
Correct Domain
+
Correct Workflow
+
Correct Authorization
+
Correct Calculation
+
Correct Audit
+
Correct UX
+
Correct Security
```

The website is complete only when the entire workflow works:

```text
Login
 ↓
Case
 ↓
Facts
 ↓
Claim Value
 ↓
Classification
 ↓
Rule
 ↓
Calculation
 ↓
Explanation
 ↓
Estimate
 ↓
Review
 ↓
Approval
 ↓
Audit
 ↓
History
```

That complete vertical slice is the first production milestone.

