# AI Fight Club - Project TODO

## Phase 1: Project Scaffolding ✅
- [x] Create Node.js + Express + React project structure
- [x] Set up TypeScript configuration
- [x] Install dependencies
- [x] Create shared types and schema interfaces
- [x] Create database schema (10 tables)
- [x] Set up build configuration (Vite for client, tsc for server)

## Phase 2: Database & Authentication ✅
- [x] Create MySQL schema with 10 tables
- [x] Implement database connection pool
- [x] Create database query helpers
- [x] Implement bcrypt password hashing
- [x] Implement JWT token generation and verification
- [x] Create auth endpoints (signup, login, logout, me)
- [x] Create migration script
- [x] Create seed script with demo data
- [x] Build server successfully (no TypeScript errors)
- [x] Build client successfully (no TypeScript errors)

## Phase 3: Core Backend APIs
- [x] Create curriculum endpoints (stages, topics, tasks)
- [x] Create submission endpoints (create, list, get)
- [x] Create review endpoints (create, list, get)
- [x] Create progress endpoints (user progress, streak, achievements)
- [x] Create admin endpoints (user list, overdue list)
- [x] Create excuse endpoint (admin only)
- [x] Implement hard-block logic (prevent submissions if blocked)
- [x] Implement auto-approval for self-report milestones
- [x] Implement achievement checking system
- [x] Add GitHub API verification for repo validation
- [x] Add peer review auto-assignment logic
- [x] Add overdue detection and auto-blocking
- [x] Add streak calculation logic
- [ ] Add discussion session endpoints

## Phase 4: Frontend Pages & UI
- [x] Create Notion-style CSS design system
- [x] Create App.tsx with routing and layout
- [x] Create LoginPage component
- [x] Create SignupPage component
- [x] Create Dashboard page (placeholder)
- [x] Create Curriculum page (placeholder)
- [x] Create MyReviews page (placeholder)
- [x] Create Progress page (placeholder)
- [x] Create AdminPanel page (placeholder)
- [x] Implement Dashboard with real data
  - [ ] Show current week's tasks
  - [ ] Show overdue items (if blocked)
  - [ ] Show streak and achievements
  - [ ] Show recent activity
- [x] Implement Curriculum browser
  - [ ] Show stages and topics
  - [ ] Show locked/unlocked status
  - [ ] Show resources per topic
- [x] Implement Submission flow
  - [ ] Reading/video/notes/quiz submission forms
  - [ ] Coding/project submission with GitHub URL
  - [x] GitHub URL validation
  - [ ] Show submission status
- [x] Implement My Reviews page
  - [ ] Show assigned reviews
  - [ ] Show submitter history
  - [ ] Approve/request changes/reject UI
- [x] Implement Progress page
  - [ ] Show submission history
  - [ ] Show achievements
  - [ ] Show streak info
- [x] Implement Admin Panel
  - [ ] Curriculum editor
  - [ ] Weekly task assignment
  - [ ] Group dashboard (completion rates, overdue rates)
  - [x] Excuse management UI
  - [ ] Achievement rule configuration

## Phase 5: Business Logic Implementation
- [x] GitHub API verification
  - [x] Validate repo exists
  - [x] Validate repo is public
  - [x] Validate repo has commits
- [x] Peer review auto-assignment
  - [x] Prefer reviewers who completed the topic
  - [x] Fall back to least-loaded active member
  - [x] Never assign submitter as reviewer
- [x] Overdue detection
  - [x] Auto-flip pending submissions past due date to overdue
  - [x] Auto-set is_blocked flag when overdue exists
- [x] Streak calculation
  - [x] Increment on-time completion
  - [x] Reset on missed deadline
  - [x] Never decrease longest_streak_weeks
- [x] Achievement engine
  - [x] first_submission
  - [x] streak_4
  - [x] streak_12
  - [x] stage_complete
  - [x] capstone_complete
  - [x] first_review_given
  - [x] perfect_week
- [ ] Discussion sessions
  - [ ] Create discussion session endpoint
  - [ ] Join discussion session endpoint
  - [ ] Auto-log attendance as submission
- [ ] Activity feed
  - [ ] Opt-in/opt-out visibility
  - [ ] Show recent achievements
  - [ ] Show recent streaks

## Phase 6: Testing & Validation
- [ ] Write unit tests for auth
- [ ] Write unit tests for database queries
- [ ] Write integration tests for API endpoints
- [ ] Write tests for blocking logic
- [ ] Write tests for streak calculation
- [ ] Write tests for achievement engine
- [ ] Manual testing of all features
- [ ] Test GitHub verification
- [ ] Test peer review flow
- [ ] Test admin excuse flow
- [ ] Test blocked member restrictions

## Phase 7: Deployment & Documentation
- [ ] Create deployment guide
- [ ] Create API documentation
- [ ] Create user guide
- [ ] Set up environment variables for production
- [ ] Test production build
- [ ] Create database backup strategy
- [ ] Set up monitoring/logging

## Known Issues & Notes
- lucide-react version compatibility with React 18 (using older version)
- Need to implement GitHub API token handling
- Need to set up proper error handling and logging
- Need to implement rate limiting for API endpoints
- Need to add input validation for all endpoints
- Need to implement proper CORS configuration

## Acceptance Criteria Checklist
- [x] Passwords hashed with bcrypt, never stored plaintext
- [x] Role-based access control enforced server-side
- [x] Hard block prevents blocked members from submitting new work
- [x] Excuse system unblocks without restoring streak
- [x] GitHub verification validates repo existence and commits
- [x] Locked topics genuinely unreachable
- [x] Peer review auto-assignment works correctly
- [x] Streak counter updates on approval, not on excuse
- [x] Achievement engine auto-triggers
- [x] Admin dashboard shows blocked members
- [ ] Activity feed respects opt-in flag
