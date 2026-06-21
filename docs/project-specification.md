# Baby Tracker — Master Project Specification (v1)

## Project Vision

Build a modern AI-powered baby tracking platform that helps parents understand, track, and improve their baby's health, routines, development, and daily care.
The application should not only record baby activities but also convert them into actionable insights through analytics, pattern detection, and AI-powered recommendations.

The application should focus on:

* Simplicity
* Speed
* Family collaboration
* Data-driven insights
* AI-assisted parenting guidance

Primary platforms:

* Android
* iOS

Future platform:

* Web

---

# Guiding Principles

## Product Principles

1. Fast data entry
2. Beautiful and simple UI
3. Family collaboration first
4. Privacy-focused
5. AI explains data instead of only displaying data
6. Build only what is needed
7. Optimize for real parents, not technical users

## Engineering Principles

1. Ship fast
2. Keep architecture simple
3. Avoid premature optimization
4. Prefer AI-friendly patterns
5. Minimize infrastructure complexity
6. Add services only when justified

---

# Finalized Tech Stack

## Frontend

Language:

* TypeScript

Framework:

* React Native

Runtime:

* Expo SDK 52 (Managed Workflow)

Cross-platform:

* React Native Web

Package Manager:

* pnpm

Linting:

* ESLint
* Prettier

---

## Backend

Framework:

* FastAPI

Language:

* Python 3.12

Dependency Manager:

* uv

Database:

* PostgreSQL

ORM:

* SQLAlchemy

Migrations:

* Alembic

Linting:

* Ruff

---

## Authentication

Provider:

* Firebase Authentication

Backend Validation:

* firebase-admin

Rules:

* Firebase is the only authentication system.
* No password hashing tables.
* No custom authentication system.
* No local password storage.

---

## Storage

Provider:

* Cloudflare R2

Stores:

* Baby photos
* Attachments
* Generated reports
* Future media uploads

---

## Notifications

Provider:

* Firebase Cloud Messaging (FCM)

Uses:

* Feeding reminders
* Sleep reminders
* Vaccination reminders
* Future notifications

---

## AI

Model:

* Gemini 2.5 pro

Architecture:

User
↓
Backend
↓
AI Service Layer
↓
Gemini 2.5 pro

Rules:

* All AI interactions pass through app/services/ai/
* All inputs validated via Pydantic
* All outputs validated via Pydantic
* No raw prompt concatenation

---

## Infrastructure

Development:

* Docker
* docker-compose

Hosting:

* Hetzner VPS

Future:

* AWS
* Google Cloud

---

# Monorepo Structure

```text
Baby-Tracker/

apps/
├── backend/
├── mobile-app/
└── web/

packages/
└── shared-types/

docs/
```

---

# Security Rules

## Authentication

Every protected route:

1. Receives Bearer token
2. Uses firebase-admin verification
3. Extracts firebase_uid
4. Loads authenticated user
5. Executes business logic

No route executes before token verification.

---

## Authorization

Authentication ≠ Authorization.

Every query involving:

* Family
* Baby
* Feeding
* Sleep
* Growth
* Milestones
* Future child data

must validate ownership through FamilyMember relationships.

Never expose resources solely by ID.

---

## User Model Rules

User records contain:

* id
* firebase_uid
* email
* display_name
* timestamps

firebase_uid must be:

* unique
* indexed

firebase_uid is the identity bridge between Firebase and PostgreSQL.

---

# Family System

## Roles

Permissions:

* owner
* member

Relationships:

* Mom
* Dad
* Guardian
* Grandmother
* Grandfather
* Custom values

Permissions and relationships remain separate concepts.

---

# Shared Types

Package:

packages/shared-types

Current contracts:

* User
* Family
* FamilyMember
* Baby

Do not create additional shared types until their features exist.

---

# MVP Features (Phase 1)

## Authentication

* Firebase Login
* Google Sign-In
* Apple Sign-In
* Logout
* User Sync

---

## Family Management

* Create Family
* Invite Family Member
* Join Family
* View Family Members

---

## Baby Profiles

* Create Baby
* Edit Baby
* Baby Details

---

## Feeding Tracking

Track:

* Breastfeeding
* Bottle Feeding
* Pumping

Store:

* Time
* Duration
* Quantity
* Notes

---

## Sleep Tracking

The application supports two sleep tracking methods.

### Method 1: Manual Sleep Entry

Parents can manually record a completed sleep session.

Example:

* Sleep Start: 10:50 AM
* Sleep End: 11:50 AM

The application automatically calculates:

* Sleep Duration

Stored Data:

* sleep_start
* sleep_end
* duration_minutes
* notes
* baby_id
* tracking_method = "manual"

Use Cases:

* Parent forgot to start tracking
* Historical data entry
* Data correction
* Caregiver entering records later

---

### Method 2: Live Sleep Timer

Parents can track sleep in real time.

Workflow:

1. User taps "Start Sleep"
2. App records sleep_start timestamp
3. Sleep timer begins running
4. User taps "End Sleep" when baby wakes
5. App records sleep_end timestamp
6. Duration is automatically calculated
7. Sleep session is saved

Stored Data:

* sleep_start
* sleep_end
* duration_minutes
* notes
* baby_id
* tracking_method = "timer"

---

### Sleep Cycle Notifications

While a live sleep session is active:

* The app continuously monitors elapsed sleep time.
* The app sends notifications when configured sleep cycle milestones are reached.

Default milestone:

* 90 minutes

Example notification:

"Your baby has completed approximately one sleep cycle."

Sleep cycle durations must be configurable and not hardcoded.

Future support:

* 45 minutes
* 60 minutes
* 90 minutes
* AI-personalized cycle durations

---

### Sleep Session Data Model

All sleep sessions use the same underlying structure regardless of tracking method.

SleepSession

* id
* baby_id
* sleep_start
* sleep_end
* duration_minutes
* tracking_method
* notes
* created_at
* updated_at

---

### Sleep Analytics

Every recorded sleep session contributes to long-term analytics.

Metrics:

* Daily sleep total
* Weekly sleep total
* Monthly sleep total
* Average sleep duration
* Longest sleep session
* Number of sleep sessions
* Sleep consistency
* Sleep cycle completion frequency
* Night sleep vs nap sleep
* Wake-up patterns

---

### Future AI Insights

Examples:

* "Your baby slept 14% more this week."
* "Most wake-ups occur between 3:00 AM and 4:00 AM."
* "Your baby completes a full sleep cycle in 78% of naps."
* "Average nighttime sleep increased by 22 minutes this week."
* "Your baby tends to wake shortly before completing a sleep cycle."

AI analysis should use historical sleep-session data rather than only the most recent sleep record.

---

### Future Enhancement: Sleep Session Classification

Future versions may classify sleep sessions as:

* Nap
* Night Sleep

Classification can be:

* User-selected
* Automatically detected by AI

This will improve sleep analytics and long-term sleep pattern insights.


# Phase 2 Features

## Diaper Tracking

Track:

* Wet
* Dirty
* Mixed

---

## Growth Tracking

Track:

* Weight
* Height

---

## Milestones

Track:

* Development milestones
* Achievement dates
* Notes

---

## Dashboard

Display:

* Today's activity
* Feeding summary
* Sleep summary
* Growth summary

---

## Reports

Generate:

* Daily reports
* Weekly reports
* Monthly reports

---

## Notifications

* Feeding reminders
* Sleep reminders
* Growth reminders

---

# Phase 3 Features

## AI Insights
### Sleep Intelligence

The AI system should analyze historical sleep data to identify:

- Sleep cycle completion rates
- Common wake-up windows
- Nap consistency
- Night sleep trends
- Sleep regressions
- Personalized sleep recommendations

The AI should gradually personalize sleep-cycle estimates based on each baby's historical sleep patterns rather than relying solely on fixed durations.

Examples:

* Sleep pattern detection
* Feeding trend detection
* Growth trend analysis

---

## Weekly AI Summaries

Examples:

"Your baby slept 12% more this week."

"Feeding intervals have become more consistent."

---

## AI Parenting Assistant

Examples:

* Why is my baby sleeping less?
* Is this feeding pattern normal?
* What changed this week?

---

# Future Features

## Health

* Vaccinations
* Medications
* Pediatric records
* Health history

---

## Advanced AI

* Personalized parenting recommendations
* Development insights
* Routine optimization

### Predictive Sleep Insights

Future AI models may predict:

- Expected wake-up time
- Likelihood of completing a sleep cycle
- Optimal nap timing
- Potential sleep regressions
- Personalized sleep schedules
---

## Web Platform

* Parent dashboard
* Reports
* Administration

---

# Build Order

1. Firebase Authentication
2. User Sync
3. Family Creation
4. Family Members
5. Baby Profiles
6. Feeding Tracking
7. Sleep Tracking
8. Dashboard
9. Notifications
10. AI Insights

---

# Explicitly Out of Scope (For Now)

Do not add:

* Redis
* Kafka
* Celery
* GraphQL
* Nginx
* Prometheus
* Grafana
* Advanced RBAC
* Service Meshes
* Protocol Buffers
* JSON Schema generation pipelines
* OpenAPI code generation pipelines

until a real business need exists.

---

# Success Criteria for MVP

A parent should be able to:

1. Sign in
2. Create a family
3. Add a baby
4. Track feeding
5. Track sleep
6. Share access with another parent
7. View daily summaries
8. Receive reminders

without reading any instructions.
