# AI Fight Club

AI Fight Club is a full-stack accountability platform for an ordered AI-engineering curriculum. Members submit weekly milestones, exchange peer reviews, build streaks, and are blocked from new submissions when work becomes overdue.

## Current status

The core member workflow is implemented:

- Email/password authentication with bcrypt and JWT
- Ordered stages and server-enforced topic prerequisites
- Self-approved reading, video, notes, and quiz milestones
- GitHub verification for coding and mini-project submissions
- Automatic peer-review assignment and review decisions
- Five-minute overdue processing, hard blocking, and admin excuses
- Weekly streak updates and automatic achievement triggers
- Member dashboard, curriculum, reviews, and progress pages
- Admin blocked-member overview and excuse controls

This is not yet production-ready. Curriculum editing, task creation UI, discussion sessions, rate limiting, transactional multi-query workflows, and broad API/database integration coverage are still outstanding. See `todo.md`.

## Stack

- React 18, React Router, Axios, and Vite
- Express and TypeScript
- MySQL 8
- bcrypt and JWT
- Vitest and Testing Library

## Setup

Requirements: Node.js 20.19+ and MySQL 8.

```bash
npm install
copy .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies `/api` to the backend at `http://localhost:3000`.

For production, `JWT_SECRET` is mandatory; startup fails if it is absent. `GITHUB_TOKEN` is optional but recommended to avoid GitHub’s low anonymous API rate limit.

## Verification

```bash
npm test -- --run
npm run build
npm audit
```

## Demo accounts

After seeding:

- `alice@example.com` / `password123`
- `bob@example.com` / `password123` (blocked example)
- `carol@example.com` / `password123`
- `admin@example.com` / `admin123`

The seed script replaces existing application data and should only be used in development.

## Security notes

- API user responses are sanitized and never include `password_hash`.
- Authorization is enforced by the backend; hiding an admin route in React is not treated as access control.
- GitHub URLs must point to a public repository containing at least one commit.
- JWTs expire after seven days. Logout removes the client token; there is no server-side revocation list yet.

## Remaining work

The most important remaining areas are request validation, rate limiting, transaction boundaries, integration tests against MySQL, curriculum/task administration, discussion sessions, and deployment operations.
