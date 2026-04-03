## GatorGoods

Canonical project/planning docs now live under [`docs/`](docs/):

- [`docs/project-status.md`](docs/project-status.md) - current scope, issue map, milestones, and blockers
- [`docs/architecture.md`](docs/architecture.md) - routes, auth rules, data model, and API contracts
- [`docs/evaluation-plan.md`](docs/evaluation-plan.md) - study conditions, tasks, metrics, and data collection
- [`docs/demo-runbook.md`](docs/demo-runbook.md) - final demo/video walkthrough and fallback plan
- [`docs/workflow.md`](docs/workflow.md) - issue, branch, PR, and definition-of-done rules

The older `.cursor/plans/*.plan.md` files are preserved for history but are now superseded by the docs above.

## GatorGoods Dev Setup

This project is a React frontend (Create React App) with an Express + MongoDB backend.

### 1. Install dependencies

From the repository root:

```bash
npm install
cd backend
npm install
```

### 2. Environment variables

### Backend

The backend expects a MongoDB connection string in `backend/.env`:

```bash
mongo_url=your-mongodb-connection-string
```

An example file is provided at `backend/.env.example`. **Do not commit your real `.env` file.**

### Frontend (Clerk Auth)

The frontend uses Clerk for authentication. Set your publishable key in the repo root `.env.local` for local development:

```bash
REACT_APP_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
```

Clerk Allowlist is enabled in the Clerk dashboard for this project.
The current `@ufl.edu` signup restriction is configured in Clerk, not enforced by frontend code in this repo. Review or change it in your Clerk dashboard settings at [dashboard.clerk.com](https://dashboard.clerk.com). Allowlist is free for development, but if we push to production, we may need to re-evaluate.

The Express backend no longer handles user login or signup. It currently stores marketplace listing data only.

### 3. Scripts

From the repository root:

- **Frontend only**

  ```bash
  npm start
  ```

  Runs the React app at `http://localhost:3000`.

- **Backend only**

  ```bash
  cd backend
  npm run dev
  ```

  Runs the Express API with `nodemon` at `http://localhost:5000`.

- **Frontend + backend together**

  ```bash
  npm run serverStart
  ```

  Uses `npm-run-all` to start both the frontend (`frontStart`) and backend (`backStart`) in parallel.

- **Seed demo data for class evaluation**

  ```bash
  npm run seed:demo
  ```

  By default this safely reseeds only demo-tagged records and leaves unrelated marketplace data alone. The presentation dataset includes:
  - 8 polished accounts
  - 13 live listings across all 8 marketplace categories, plus 1 historical deleted-item thread context
  - 14 offers
  - 7 participant-first conversation threads with populated seller and buyer inbox views, including several multi-item relationship threads, item-history context, and compact viewer-aware sent/accepted/rejected offer events
  - presenter-owned `Desk Lamp` (`active`) and `Mini Fridge` (`reserved`) listings for the core demo flow

  Useful seed inputs:
  - `DEMO_USER_EMAIL=you@ufl.edu`
    Uses the Clerk Backend API to resolve the presenter account by email. Requires `CLERK_SECRET_KEY`.
  - `DEMO_USER_ID=your_clerk_user_id`
    Uses a known presenter Clerk ID directly when email lookup is not needed.
  - `CLERK_SECRET_KEY=sk_test_...`
    Required only when `DEMO_USER_EMAIL` is set.
  - `SEED_FULL_RESET=true`
    Clears every backend collection before seeding. Use only when you want a complete reset.
  - `SEED_TAG=custom-demo-tag`
    Overrides the default safe cleanup namespace (`gatorgoods-demo`).
  - `FAKER_SEED=20260401`
    Refreshes filler bios/messages deterministically while keeping the curated scenario set stable.

  Common commands:

  ```bash
  DEMO_USER_EMAIL=you@ufl.edu CLERK_SECRET_KEY=sk_test_... npm run seed:demo
  ```

  ```bash
  DEMO_USER_ID=your_clerk_user_id npm run seed:demo
  ```

  ```bash
  SEED_FULL_RESET=true npm run seed:demo
  ```
