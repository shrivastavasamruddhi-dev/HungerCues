y# HungerCues: An AI-Powered Intelligent Child Development Companion

> **One-line Pitch for Judges:**
> HungerCues is an AI-powered parenting companion that leverages the Gemini API as its core reasoning engine to transform raw baby activity data (feeding, sleep, metrics) into personalized, proactive, and actionable childcare guidance.

> **Hackathon Pitch Tip:**
> *"We built an AI-first architecture where the Gemini API serves as the application's reasoning engine rather than just an isolated chatbot layer."*

---

## 📌 Problem Statement

Modern parents, especially first-time parents, are overwhelmed by fragmented child development information spread across social media, websites, doctor recommendations, and parenting forums. Tracking a baby's growth, nutrition, sleep patterns, vaccinations, developmental milestones, and behavioral changes often requires using multiple applications or manually maintaining unstructured paper logs.

Furthermore, parents frequently struggle to answer questions such as:
* **Nutrition:** Are today's feeding schedules and amounts healthy? Is my baby eating enough?
* **Sleep:** Is my baby's sleep duration and consistency normal? How can I establish a healthy schedule?
* **Development:** Which milestone should my baby achieve next, and what exercises support it?
* **Medical:** Is my baby's routine changing abnormally? Do these symptoms warrant a doctor's visit?
* **Personalization:** How can I personalize care according to my baby's unique habits?

Existing solutions are primarily **passive trackers**. They act as databases that store numbers (ounces, hours) but fail to provide intelligent, context-aware guidance. Parents are left with raw data but no interpretation.

---

## 💡 Our Solution: HungerCues

**HungerCues** transforms baby tracking from a simple data collection system into an **intelligent decision support system**. 

By combining structured baby logs (feedings, sleep timers, profiles) with the advanced intelligence of the **Gemini 2.5 Flash API**, HungerCues serves as a **24/7 AI pediatric assistant**. It continuously analyzes a baby's historical activities, growth, and sleep logs to generate meaningful, proactive, and context-aware recommendations tailored to the baby's unique timeline.

---

## ✨ Key Features

### 1. Smart Baby Dashboard
A centralized, premium interface designed for sleep-deprived parents.
* **Feeding Tracker:** Log feeding duration, types (`breast`, `bottle`, `pumping`), quantity (in ml), and specific notes.
* **Sleep Tracker:** Record manual sleep sessions or use the live timer.
* **Profile Management:** Maintain detailed records of baby profiles (gender, birth date, name).
* **Live Status Indicator:** Real-time feedback on backend connectivity (SQLite / Postgres) and database health.

### 2. Gemini-Powered AI Parenting Assistant (The Core Reasoning Engine) ⭐
Instead of calling a generic chatbot, HungerCues feeds structured profile details, historical logs, sleep timelines, and feeding records directly to the **Gemini 2.5 Flash API**. 

The engine analyzes:
* Baby's age (derived from birth date)
* Feeding intervals and quantities
* Sleep durations and tracking methods (timer vs manual)
* Notes and parental concerns

It then returns a strictly type-safe, structured JSON response parsed directly into the UI:
* **Daily AI Summary:** A friendly, personalized 2-3 sentence overview of the baby's logs.
* **Feeding Insights:** Deep analysis of feeding frequency, quantities, and intervals.
* **Sleep Insights:** Sleep pattern consistency, nap structure, and sleep hygiene.
* **Actionable Recommendations:** A curated list of 3 actionable, scientifically grounded parenting tips.

### 3. Real-Time Sleep Timer
A live sleep session tracker. Tap **Start Sleep Session** when the baby falls asleep and **Stop & Save Session** when they wake. HungerCues automatically calculates sleep durations, feeds this into the analytics dashboard, and provides exact records to Gemini to detect sleep regressions or cycle completions.

### 4. Zero-Config Hackathon Presentation Mode
To ensure the application runs seamlessly during live judging on any environment, HungerCues includes key presentation-ready features:
* **Dynamic Database Fallback:** The backend automatically tries to connect to PostgreSQL. If Postgres is down or unconfigured, it seamlessly drops back to a local SQLite database (`baby_tracker.db`) and auto-creates all database schemas on startup. **No Docker, Postgres, or schema installation is required to start the app.**
* **Local Auth Bypass:** Standard bearer authentication (`Bearer mock-token`) bypasses Firebase verification in development mode, allowing instant UI demonstration.

---

## 🛠️ Technical Architecture

HungerCues is designed with an AI-first monorepo architecture:

```
                  ┌──────────────────────────────────────────────┐
                  │          React Native / Expo App             │
                  │        (Mobile / Web-Ready Dashboard)        │
                  └──────────────────────┬───────────────────────┘
                                         │ HTTP (JSON + Auth Bypass)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │               FastAPI Backend                │
                  │       (Endpoints / Services / Router)        │
                  └──────┬───────────────────────────────┬───────┘
                         │                               │
                         │ ORM (SQLAlchemy)              │ HTTPS (httpx client)
                         ▼                               ▼
  ┌──────────────────────────────────────────────┐ ┌───────────────────────────┐
  │              Database Layer                  │ │     Gemini 2.5 Flash      │
  │    (Postgres 16 / SQLite Fallback)           │ │  (Core Reasoning Engine)  │
  └──────────────────────────────────────────────┘ └───────────────────────────┘
```

### Stack Details
* **Frontend:** React Native (Expo SDK 52) with full Web support via React Native Web.
* **Backend:** FastAPI (Python 3.12) with SQLAlchemy asynchronous ORM.
* **Database:** PostgreSQL (Production) / SQLite (`aiosqlite`) (Development fallback).
* **AI Engine:** Gemini 2.5 Flash API via native HTTP `httpx` async client.
* **Auth Bridge:** Firebase Authentication with a custom local development bypass.

---

## 📂 Project Structure

```
HungerCues/
├── apps/
│   ├── backend/       # FastAPI REST API (with dynamic SQLite fallback & auto-schema creation)
│   ├── mobile-app/    # Expo React Native App (High-fidelity dashboard in App.tsx)
│   └── web/           # Web portal implementation
├── packages/
│   └── shared-types/  # Shared TypeScript type definitions
└── docs/              # Architecture, API endpoints, and roadmap specifications
```

---

## 🚀 Quick Start (Prototype / Demo Mode)

Set up and run HungerCues locally in under 3 minutes:

### Prerequisites
* **Node.js** >= 18
* **pnpm** >= 8
* **Python** >= 3.12
* **uv** (Python package manager)

---

### Step 1: Install Dependencies
From the root of the project, install Javascript workspace dependencies:
```bash
pnpm install
```

---

### Step 2: Configure the Backend
Navigate to the backend app, copy the environment configuration, and install dependencies using `uv`:
```bash
cd apps/backend
cp .env.example .env
uv sync
```
> [!IMPORTANT]
> To enable live Gemini Insights, add your Gemini API Key in `apps/backend/.env`:
> ```env
> GEMINI_API_KEY=your_actual_gemini_api_key
> ```

---

### Step 3: Run the FastAPI Backend
Start the FastAPI server. Because of the dynamic database fallback, the backend will auto-detect if PostgreSQL is offline, instantly set up a local SQLite database (`baby_tracker.db`), and migrate the database schema automatically.
```bash
uv run uvicorn app.main:app --reload
```
The server will start at `http://localhost:8000`.

---

### Step 4: Run the Mobile Dashboard
Open a new terminal at the project root and launch the React Native Web interface:
```bash
pnpm --filter @baby-tracker/mobile-app web
```
This will open the high-fidelity, interactive dashboard directly in your web browser. You can click **Start Sleep Session**, **Log Feeding**, and **Get AI Insights** to see the Gemini reasoning engine in action!

---

## 📖 Deep-Dive Documentation
For more details on implementation details, check out:
* 📘 [Architecture & System Flow](docs/architecture.md)
* 🔑 [Security & Verification Design](docs/security.md)
* 📡 [API Endpoints & Contracts](docs/api.md)
* 🗺️ [Product Roadmap & Phased Execution](docs/product-roadmap.md)
