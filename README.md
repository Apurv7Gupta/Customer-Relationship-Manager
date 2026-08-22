### Setup Instructions

### Frontend

```
frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/
│   │   └── form/
│   ├── config/
│   ├── context/
│   ├── features/
│   │   ├── auth/
│   │   ├── leads/
│   │   ├── dashboard/
│   │   ├── follow-ups/
│   │   └── escalations/
│   ├── hooks/
│   ├── layouts/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── .env
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts

```

### Backend

```
backend/
├── app/
│ ├── main.py
│ ├── api/
│ │ ├── auth.py
│ │ ├── users.py
│ │ ├── leads.py
│ │ ├── activities.py
│ │ ├── followups.py
│ │ ├── escalations.py
│ │ └── webhooks.py
│ ├── core/
│ │ ├── config.py
│ │ ├── security.py
│ │ ├── permissions.py
│ │ └── exceptions.py
│ ├── schemas/
│ ├── services/
│ ├── repositories/
│ ├── integrations/
│ │ ├── ai_provider.py
│ │ └── messaging_provider.py
│ └── tests/


```

---

### System Architecture Overview

The system is a decoupled, role-secured CRM with an asynchronous ingestion pipeline, AI-assisted classification, and an event audit trail.

```
[ External Entities ]
  ├── WhatsApp / Webhook Provider
  └── Frontend Client (React SPA)

[ Gateway & API Layer (FastAPI) ]
  ├── Auth & RBAC Middleware (OAuth2 Password Bearer / RoleChecker)
  ├── Leads API Router (/api/leads)
  ├── Users API Router (/api/users)
  ├── Activities API Router (/api/activities)
  ├── Follow-ups API Router (/api/followups)
  ├── Escalations API Router (/api/escalations)
  └── Webhooks Ingestion Router (/api/webhooks)

[ Business Logic & Integration Layer ]
  ├── Security / Password Hashing (bcrypt)
  ├── AI Provider Pipeline (MockAIProvider / LLM Classifier)
  ├── Messaging Provider (MockWhatsAppProvider)
  └── Automatic Event Dispatcher (Status & Assignment Activity Logger)

[ Persistence Layer (MongoDB Collections) ]
  ├── users
  ├── leads
  ├── activities
  ├── followups
  ├── escalations
  └── messages

```

---

#### 1. Presentation Layer (Frontend - React + Vite + TypeScript)

- **Role-Based Views:**
- **All Authenticated Roles:** Dashboard (Metrics counters), Lead Details, Activity Timelines, AI Conversation Viewer & Reply Approver.

- **Owner / Sales Manager:** Lead Reassignment controls, Escalation Management (`/escalations`).

- **Owner Only:** Lead Creation/Deletion, User Management (`/users`).

- **Routing & Guards:** React Router with `ProtectedRoute` evaluating JWT token claims (`role`, `is_active`).

#### 2. Application & API Layer (FastAPI Async Engine)

- **Authentication & Access Control:**
- `RoleChecker` dependency wrapping endpoints to enforce Owner, Sales Manager, and Sales Executive boundaries.

- Row-level isolation: Queries enforce `assigned_to == current_user._id` for Sales Executives.

- **Webhook & Ingestion Pipeline:**
- Receives incoming WhatsApp payloads (`provider_message_id`, `sender_phone`, `message`).

- Validates message uniqueness (idempotency check) against the `messages` collection.

- Matches existing lead by phone number or initializes a new lead document.

- **AI Classification Pipeline (`AIProvider`):**
- Analyzes inbound text for intent, sentiment, priority, and prompt injections.

- Generates structured metadata: `suggested_status`, `suggested_next_action`, `reply_draft`, and `confidence` score.

- Evaluates escalation triggers (e.g., complaints, pricing/legal requests, low confidence).

- Creates an `escalations` document if `requires_human_escalation == True`.

#### 3. Domain Event Logging (Audit Trail)

- **Activity Dispatcher:**
- Automatically creates an entry in `activities` upon lead status change (`ActivityType.STATUS_CHANGE`).

- Automatically creates an entry upon lead reassignment (`ActivityType.ASSIGNMENT_CHANGE`), resolving and recording the assignee’s readable email rather than a raw ID.

- Allows manual notes, call logs, and meeting entries.

#### 4. Database Layer (MongoDB Collections & Relationships)

- **`users`**: `_id`, `email`, `hashed_password`, `role` (owner | sales_manager | sales_executive), `is_active`.

- **`leads`**: `_id`, `name`, `email`, `phone`, `status`, `priority`, `source`, `assigned_to` (User `_id`), `created_by` (User `_id`), `created_at`, `updated_at`.

- **`messages`**: `_id`, `lead_id` (Lead `_id`), `provider_message_id` (Unique), `direction` (inbound | outbound), `message`, `ai_analysis` (embedded sub-document), `reply_draft`, `reply_status` (draft | approved).

- **`escalations`**: `_id`, `lead_id` (Lead `_id`), `message_id` (Message `_id`), `reason`, `priority`, `status` (open | assigned | in_progress | resolved), `assigned_to` (User `_id`), `created_at`, `resolved_at`.

- **`activities`**: `_id`, `lead_id` (Lead `_id`), `activity_type`, `description`, `created_by` (User `_id`), `created_at`.

- **`followups`**: `_id`, `lead_id` (Lead `_id`), `description`, `due_at`, `assigned_to` (User `_id`), `status` (pending | completed | overdue).

---

### Data Flow for Primary Execution Paths

#### A. Inbound Message Processing Flow

1. `WhatsApp Provider` $\rightarrow$ `POST /api/webhooks/whatsapp`

2. `Webhooks API` $\rightarrow$ Checks `messages` for `provider_message_id` (Idempotency)

3. `Webhooks API` $\rightarrow$ Matches or creates Lead in `leads` collection

4. `Webhooks API` $\rightarrow$ Invokes `AIProvider.analyze_message()`

5. `AIProvider` $\rightarrow$ Returns structured `AIAnalysis` + `reply_draft`

6. `Webhooks API` $\rightarrow$ Stores message in `messages` collection

7. _Conditional Branch:_ If `requires_human_escalation == True` $\rightarrow$ Inserts document into `escalations` collection

#### B. Lead Update & Event Audit Flow

1. `Client (Owner/Manager)` $\rightarrow$ `PATCH /api/leads/{lead_id}` (Change status/assignee)

2. `FastAPI Middleware` $\rightarrow$ Validates JWT & User Role via `RoleChecker`

3. `Leads API` $\rightarrow$ Validates assignee exists in `users` and has `sales_executive` role

4. `Leads API` $\rightarrow$ Updates `leads` document timestamp and fields

5. `Leads API` $\rightarrow$ Inserts audit records into `activities` (`status change` or `assignment change`)

#### C. AI Reply Review Flow

1. `Client (Sales Rep)` $\rightarrow$ Reviews timeline on `LeadDetail.tsx`

2. `Client` $\rightarrow$ Clicks "Approve" on draft $\rightarrow$ `PATCH /api/messages/{message_id}` (`approved: true`)

3. `Messages API` $\rightarrow$ Updates `reply_status` to `"approved"` and logs `reply_approved_at`

### Scaling to 100,000+ Leads

At 100,000+ records, naive linear document scans (`COLLSCAN`) and synchronous I/O operations will bottleneck the database and freeze the API thread pool. Scalability is maintained through strategic database indexing and background task delegation.

```
                           ┌────────────────────────────────────────┐
                           │            Inbound Webhook             │
                           └──────────────────┬─────────────────────┘
                                              │
                                              ▼
┌──────────────────┐           ┌────────────────────────────────────┐
│                  │  202 Acc  │        FastAPI Ingestion           │
│   External API   │◄──────────┤ - Idempotency Check                │
│                  │           │ - Raw Ingest to DB                 │
└──────────────────┘           └──────────────┬─────────────────────┘
                                              │
                                              ▼
                               ┌────────────────────────────────────┐
                               │     Async Task Queue (Redis)       │
                               │  (Celery / ARQ Background Workers) │
                               └──────────────┬─────────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
      ┌───────────────────────────────┐                 ┌──────────────────────────────┐
      │      AI Classification        │                 │      MongoDB Execution       │
      │  (Summarization, Sentiment)   │                 │ (Covered Index Queries Only) │
      └───────────────────────────────┘                 └──────────────────────────────┘

```

#### Database Indexing Strategy

Compound and single-field B-tree indexes are mandatory across primary query filters to ensure all pagination and filtering operations use indexed lookups (`IXSCAN`):

| Target Collection | Index Fields                           | Purpose / Optimization                                                                                    |
| :---------------- | :------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `leads`           | `{"phone": 1}`                         | Unique index; enforces O(1) duplicate prevention during webhook ingestion and lead creation.              |
| `leads`           | `{"assigned_to": 1, "updated_at": -1}` | Optimizes role-based query isolation for Sales Executives viewing their assigned leads sorted by recency. |
| `leads`           | `{"status": 1, "updated_at": -1}`      | Accelerates status-based dashboard filtering and pipeline views.                                          |
| `leads`           | `{"name": "text", "email": "text"}`    | Replaces unanchored `$regex` full-collection scans with tokenized text search.                            |
| `activities`      | `{"lead_id": 1, "created_at": -1}`     | Powers chronological timeline pagination on the lead detail view without scanning unrelated logs.         |
| `messages`        | `{"provider_message_id": 1}`           | Unique index enforcing strict webhook idempotency.                                                        |

---

#### Background Job Delegation

1. **Decoupled Webhook Ingestion:** Inbound webhooks immediately persist the raw payload, enforce idempotency, enqueue a processing task, and return an immediate `200 OK` or `202 Accepted` response. This prevents upstream webhook timeouts during traffic spikes.
2. **Asynchronous Worker Queues:** Heavy external operations—such as calling external LLMs for message analysis, calculating follow-up overdue statuses, and sending bulk notifications—are offloaded to distributed workers (e.g., Celery or ARQ backed by Redis).

3. **Cursor-Based Pagination:** For deep pagination across 100,000 records, standard offset-based pagination (`skip().limit()`) degrades because MongoDB must traverse all skipped documents. The query model shifts to keyset/cursor pagination using `_id` or `updated_at` boundaries (e.g., `{"updated_at": {"$lt": last_seen_timestamp}}`) to maintain constant $O(1)$ query execution times.
