# CareerNotification — Complete Scalable Architecture Plan

## Vercel + Next.js Full Stack + MongoDB Atlas
### Future-ready path for Redis, BullMQ, Workers, and 100K+ users

**Project:** CareerNotification  
**Domain:** https://www.careernotification.com/  
**Primary architecture:** Next.js + TypeScript + MongoDB Atlas  
**Initial hosting:** Vercel  
**Target:** 100,000+ registered users, reusable exam content, TNPSC + SSC + Banking + Technical + School syllabus

---

# 1. Executive Decision

## Recommended starting architecture

For CareerNotification, start with:

```text
Users
  |
  v
Vercel
  |
  +-- Next.js Frontend
  |
  +-- Next.js Backend/API
          |
          v
      MongoDB Atlas
```

Do **not** start with a separate AWS backend.

The application should be designed so Redis, BullMQ, and separate workers can be added later without redesigning the database or business logic.

The architecture is therefore:

```text
PHASE 1

Vercel
  |
  +-- Next.js Frontend
  +-- Next.js API / Route Handlers
          |
          v
      MongoDB Atlas
```

```text
PHASE 2

Vercel
  |
  +-- Next.js Frontend
  +-- Next.js API
          |
          +---- MongoDB Atlas
          |
          +---- Redis
```

```text
PHASE 3

Vercel
  |
  +-- Next.js Frontend
  +-- Next.js API
          |
          +---- MongoDB Atlas
          |
          +---- Redis
                  |
                  +---- BullMQ
                          |
                          v
                       Workers
```

This follows the earlier architecture principle: keep the application modular and stateless so infrastructure can evolve independently.

---

# 2. Core Architecture Principle

The platform must NOT be designed as separate question banks or databases for every exam.

Use a reusable content architecture:

```text
                          CAREER NOTIFICATION
                                  |
              +-------------------+-------------------+
              |                   |                   |
           CONTENT              EXAMS               USERS
              |                   |                   |
       +------+------+        +---+---+          +----+----+
       |      |      |        |       |          |         |
     Board  Class Subject    Exam   Cycle     Attempts  Profile
       |      |      |        |       |          |
       +------+------+        |   Test Series   |
              |               |       |          |
           Chapter            |     Tests         |
              |               |       |           |
            Topic             +-------+-----------+
              |                       |
           Question             Test Questions
                                      |
                                   Results
```

**Golden principle:**

> A question is reusable content. An exam/test is a consumer of that content.

A single question can be reused in:

- TNPSC Group 4
- TNPSC Group 2
- SSC CGL
- School revision
- Daily quiz
- Subject test
- Chapter test
- Previous-year-style practice

Do not duplicate the question document for every test.

---

# 3. Final Technology Stack

## Phase 1 — Minimum-cost starting stack

| Layer | Technology |
|---|---|
| Frontend | Next.js |
| Backend | Next.js Route Handlers |
| Language | TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Hosting | Vercel |
| Database | MongoDB Atlas |
| Validation | Zod |
| Authentication | Next.js-compatible auth/session solution |
| Files | Add S3/R2 when required |

## Phase 2 — Add when concurrency requires it

| Layer | Technology |
|---|---|
| Cache | Redis |
| Live test state | Redis |
| Rate limiting | Redis |
| Distributed locks | Redis where necessary |

## Phase 3 — Add when background work becomes heavy

| Layer | Technology |
|---|---|
| Queue | BullMQ |
| Queue backend | Redis |
| Workers | Separate worker/container/server environment |

## Important

Do not start with:

- AWS backend
- Express/NestJS backend
- Kubernetes
- Microservices
- Multiple databases
- Multiple API services

unless actual requirements justify them.

Build for scalability, but do not pay for infrastructure before it is needed.

---

# 4. Why Next.js for Both Frontend and Backend?

Next.js can handle:

- Frontend
- React UI
- Server-side rendering
- SEO
- Public exam pages
- Admin dashboard
- Student dashboard
- Authentication integration
- API endpoints
- Business application layer

The recommended architecture is a **modular monolith**.

```text
                         Next.js
                            |
             +--------------+--------------+
             |                             |
         Frontend                       API Layer
             |                             |
             |                         Controllers
             |                             |
             |                           Services
             |                             |
             +----------------------- Repositories
                                           |
                                  +--------+--------+
                                  |                 |
                               MongoDB            Redis
                                                   |
                                                 BullMQ
                                                   |
                                                 Workers
```

The important part is NOT whether the backend is technically inside Next.js.

The important part is:

- clean modules
- clean services
- clean repositories
- proper validation
- proper authorization
- proper indexes
- stateless APIs
- durable database state
- Redis for high-frequency state later
- workers for heavy background processing later

---

# 5. Why Vercel First?

Vercel is suitable for:

- Next.js frontend
- SSR
- SEO
- public exam pages
- student dashboard
- admin dashboard
- Next.js Route Handlers
- API endpoints
- authentication/session logic
- application UI

Initial deployment:

```text
careernotification.com
        |
        v
      Vercel
        |
        +-- Next.js UI
        |
        +-- Next.js API
        |
        v
   MongoDB Atlas
```

Do not depend on Vercel process memory for important application state.

Bad:

```typescript
const activeAttempts = new Map();
const userAnswers = {};
const timers = {};
```

Important data must live outside application memory.

Use:

```text
Permanent data       -> MongoDB Atlas
Temporary state      -> Redis later
Large files          -> S3/R2 later
Background jobs      -> BullMQ later
```

---

# 6. Project Structure

Use this target structure from the beginning, even if Redis/BullMQ are not enabled immediately:

```text
career-notification/
│
├── app/
│   ├── (public)/
│   │   ├── exams/
│   │   ├── test-series/
│   │   ├── tests/
│   │   ├── results/
│   │   └── current-affairs/
│   │
│   ├── dashboard/
│   │
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── questions/
│   │   ├── syllabus/
│   │   ├── exams/
│   │   ├── test-series/
│   │   ├── tests/
│   │   ├── users/
│   │   └── reports/
│   │
│   └── api/
│       ├── auth/
│       ├── users/
│       ├── exams/
│       ├── exam-cycles/
│       ├── syllabus/
│       ├── questions/
│       ├── test-series/
│       ├── tests/
│       ├── attempts/
│       ├── results/
│       ├── leaderboard/
│       ├── subscriptions/
│       └── payments/
│
├── src/
│   ├── modules/
│   │   ├── users/
│   │   ├── exams/
│   │   ├── syllabus/
│   │   ├── questions/
│   │   ├── test-series/
│   │   ├── tests/
│   │   ├── attempts/
│   │   ├── results/
│   │   ├── leaderboard/
│   │   ├── subscriptions/
│   │   ├── payments/
│   │   └── notifications/
│   │
│   ├── lib/
│   │   ├── mongodb.ts
│   │   ├── redis.ts
│   │   ├── auth.ts
│   │   ├── queue.ts
│   │   └── logger.ts
│   │
│   ├── workers/
│   │   ├── result.worker.ts
│   │   ├── leaderboard.worker.ts
│   │   ├── notification.worker.ts
│   │   └── import.worker.ts
│   │
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rate-limit.ts
│   │   └── permissions.ts
│   │
│   └── types/
│
├── public/
├── package.json
└── tsconfig.json
```

The worker directory can remain unused initially. It exists so the codebase already has a clean future boundary.

---

# 7. API Architecture

Never put hundreds of lines of business logic inside:

```text
app/api/.../route.ts
```

Use:

```text
HTTP Request
    |
    v
Route Handler
    |
    v
Controller
    |
    v
Service
    |
    v
Repository
    |
    v
MongoDB
```

For Redis:

```text
Service
  |
  +---- MongoDB
  |
  +---- Redis
```

For background processing:

```text
Service
  |
  v
BullMQ
  |
  v
Worker
```

Example:

```text
POST /api/attempts/:id/submit
          |
          v
AttemptController
          |
          v
AttemptService
          |
          +---- ScoringService
          +---- AttemptRepository
          +---- ResultRepository
          +---- LeaderboardQueue
```

This lets you move expensive work to workers later without changing the frontend contract.

---

# 8. Database Architecture

Use MongoDB Atlas as the durable source of truth.

Recommended initial collections:

```text
users

exam_categories
exams
exam_cycles
exam_blueprints

boards
classes
subjects
chapters
topics
syllabus_nodes

questions
question_versions

test_series
tests
test_questions

attempts
attempt_answers
results

subscriptions
payments

notifications
audit_logs
```

Later:

```text
leaderboard_entries
user_performance
daily_quizzes
current_affairs
user_question_progress
question_reports
events
```

Do not create separate collections such as:

```text
class6_questions
class7_questions
class8_questions
tnpsc_group4_questions
ssc_questions
```

Use reusable content.

---

# 9. Exam Categories

Collection:

```text
exam_categories
```

Examples:

```text
TNPSC
SSC
Banking
UPSC
Railway
Technical
Teaching
Police
Defence
State Government
Central Government
```

Example:

```json
{
  "_id": "tnpsc",
  "name": "TNPSC",
  "displayName": "Tamil Nadu Public Service Commission",
  "slug": "tnpsc",
  "status": "active",
  "sortOrder": 1
}
```

Indexes:

```javascript
db.exam_categories.createIndex(
  { slug: 1 },
  { unique: true }
);

db.exam_categories.createIndex({
  status: 1,
  sortOrder: 1
});
```

---

# 10. Exams

Collection:

```text
exams
```

Examples:

```text
TNPSC Group 4
TNPSC Group 2
TNPSC Group 1
SSC CGL
SSC CHSL
IBPS PO
IBPS Clerk
SBI PO
RBI Grade B
Assistant Programmer
```

An exam is a reusable definition.

Do NOT put the year into the exam document.

Do not create:

```text
tnpsc-group-4-december-2026
```

inside `exams`.

Use `exam_cycles`.

---

# 11. Exam Cycles

Collection:

```text
exam_cycles
```

Examples:

```text
TNPSC Group 4 2026
TNPSC Group 4 2027
SSC CGL 2026
IBPS PO 2026
SBI PO 2027
```

Example:

```json
{
  "_id": "tnpsc-group-4-2026",
  "examId": "tnpsc-group-4",
  "title": "TNPSC Group 4 2026",
  "year": 2026,
  "status": "upcoming",
  "officialSource": {
    "name": "TNPSC",
    "url": "https://www.tnpsc.gov.in/"
  }
}
```

Possible statuses:

```text
draft
upcoming
application_open
application_closed
exam_completed
result_published
archived
```

---

# 12. School Content Model

CareerNotification should eventually contain:

```text
Tamil Nadu State Board
 |
 +-- Class 6
 +-- Class 7
 +-- Class 8
 +-- Class 9
 +-- Class 10
 +-- Class 11
 +-- Class 12
```

Do not create separate question collections for every class.

Recommended conceptual hierarchy:

```text
Board
 |
Class
 |
Subject
 |
Book
 |
Chapter
 |
Topic
 |
Concept
 |
Question
```

Example:

```text
Tamil Nadu State Board
  |
  +-- 10th Standard
       |
       +-- Science
            |
            +-- Physics
                 |
                 +-- Light
                      |
                      +-- Reflection
```

---

# 13. Boards

Collection:

```text
boards
```

Example:

```json
{
  "_id": "tn-state-board",
  "name": "Tamil Nadu State Board",
  "slug": "tamil-nadu-state-board",
  "country": "IN",
  "state": "Tamil Nadu",
  "status": "active"
}
```

Future:

```text
CBSE
ICSE
Kerala State Board
Karnataka State Board
Andhra Pradesh State Board
Telangana State Board
```

---

# 14. Classes

Collection:

```text
classes
```

Example:

```json
{
  "_id": "class-10",
  "boardId": "tn-state-board",
  "name": "10th Standard",
  "slug": "10",
  "sortOrder": 10,
  "status": "active"
}
```

Use the same collection for:

```text
6
7
8
9
10
11
12
```

---

# 15. Subjects, Chapters and Topics

Collections:

```text
subjects
chapters
topics
```

Example:

```text
Class 10
  |
Science
  |
Light
  |
Reflection of Light
```

Subjects can include:

```text
Tamil
English
Mathematics
Science
Social Science
Physics
Chemistry
Biology
Computer Science
Economics
Commerce
```

The exact subject structure must remain dynamic because classes do not all have identical subject structures.

---

# 16. Generic Syllabus Nodes

Competitive exams do not always follow school hierarchy.

Therefore use:

```text
syllabus_nodes
```

Example:

```text
TNPSC
 |
 +-- Group 4
      |
      +-- General Studies
           |
           +-- History
                |
                +-- Indian National Movement
```

Another:

```text
SSC
 |
 +-- CGL
      |
      +-- General Awareness
           |
           +-- Indian Polity
                |
                +-- Constitution
```

A question can map to multiple syllabus nodes.

This is one of the most important pieces of the architecture.

---

# 17. Reusable Question Bank

Collection:

```text
questions
```

A question is master content.

Example conceptual structure:

```json
{
  "_id": "q_100001",
  "type": "mcq_single",
  "question": {
    "ta": "...",
    "en": "..."
  },
  "options": [
    {
      "id": "A",
      "text": {
        "ta": "...",
        "en": "..."
      }
    }
  ],
  "correctAnswer": "B",
  "explanation": {
    "ta": "...",
    "en": "..."
  },
  "difficulty": "easy",
  "language": ["ta", "en"],
  "syllabusNodeIds": [],
  "tags": [],
  "status": "published",
  "version": 1
}
```

For the first version, support:

```text
mcq_single
true_false
integer
```

Later:

```text
mcq_multiple
fill_blank
match_following
assertion_reason
sequence
image_question
passage
coding
```

---

# 18. Question Versioning

This is critical.

Suppose Q10001 is used in 50 published tests.

If you edit the question directly, old attempts may become inconsistent.

Use:

```text
question_versions
```

Example:

```json
{
  "questionId": "q_100001",
  "version": 3,
  "questionSnapshot": {
    "question": "...",
    "options": [],
    "correctAnswer": "B",
    "explanation": "..."
  }
}
```

When a test is published, `test_questions` should reference the exact question version.

---

# 19. Test Series

Collection:

```text
test_series
```

Example:

```text
TNPSC Group 4 2026 Complete Test Series
```

Possible access:

```text
free
paid
subscription
premium
```

A test series contains multiple tests.

---

# 20. Tests

Collection:

```text
tests
```

Example configuration:

```json
{
  "_id": "test-group4-001",
  "testSeriesId": "ts-group4-2026",
  "title": "Mock Test 01",
  "testNumber": 1,
  "durationSeconds": 10800,
  "totalQuestions": 100,
  "totalMarks": 100,
  "negativeMarking": true,
  "negativeMarks": 0.25,
  "shuffleQuestions": false,
  "shuffleOptions": true,
  "showResultImmediately": true,
  "status": "published"
}
```

Recommended fields:

```text
duration
totalQuestions
totalMarks
negativeMarking
negativeMarks
shuffleQuestions
shuffleOptions
attemptLimit
passMarks
showExplanation
showCorrectAnswer
showResultImmediately
availabilityStart
availabilityEnd
```

---

# 21. Test Questions

Collection:

```text
test_questions
```

Example:

```json
{
  "_id": "tq-001",
  "testId": "test-group4-001",
  "questionId": "q_100001",
  "questionVersion": 1,
  "section": "General Studies",
  "order": 1,
  "marks": 1,
  "negativeMarks": 0.25
}
```

Do not copy the entire question into every test.

The same question can be used in:

```text
Test 01
Test 07
Test 20
Daily Quiz
Chapter Test
```

---

# 22. Exam Blueprint

For serious exam generation, use:

```text
exam_blueprints
```

Example:

```json
{
  "examId": "tnpsc-group-4",
  "examCycleId": "tnpsc-group-4-2026",
  "version": 1,
  "sections": [
    {
      "name": "General Studies",
      "questionCount": 75,
      "marks": 75
    },
    {
      "name": "Aptitude",
      "questionCount": 25,
      "marks": 25
    }
  ]
}
```

Version the blueprint.

If the official pattern changes:

```text
Group 4 Blueprint v1
Group 4 Blueprint v2
```

Tests created under v1 must remain linked to v1.

---

# 23. User and Attempt Architecture

User:

```text
users
```

Attempt:

```text
attempts
```

Answers:

```text
attempt_answers
```

Result:

```text
results
```

Relationship:

```text
User
 |
 v
Attempt
 |
 +----> Attempt Answers
 |
 v
Result
 |
 +----> Leaderboard
 |
 +----> User Performance
```

One attempt should represent one test attempt.

---

# 24. Test Engine — Initial Version

Because the initial deployment is Vercel + MongoDB Atlas, start simple.

Initial flow:

```text
User
 |
 v
Next.js API
 |
 +-- validate attempt
 +-- save answers/state as required
 |
 v
MongoDB Atlas
```

If concurrency becomes meaningful:

```text
User
 |
 v
Next.js API
 |
 v
Redis
 |
 +-- active attempt state
 +-- timer state
 +-- temporary answers
 |
 v
MongoDB
```

The database remains the durable source of truth.

---

# 25. Test Start Flow

```text
GET /api/tests/:testId
        |
        v
Authenticate
        |
        v
Check access
        |
        v
Check test availability
        |
        v
Create attempt
        |
        v
Create temporary state if Redis is enabled
        |
        v
Return questions WITHOUT answer keys
```

Response concept:

```json
{
  "attemptId": "attempt_100001",
  "testId": "test-group4-001",
  "durationSeconds": 10800,
  "expiresAt": "...",
  "questions": []
}
```

---

# 26. Never Expose Correct Answers

The browser must never receive:

```json
{
  "correctAnswer": "B"
}
```

before submission.

Instead:

```json
{
  "id": "q_100001",
  "question": "...",
  "options": []
}
```

The backend owns the answer key.

Submission:

```text
Client selected B
        |
        v
Backend
        |
        v
Load correct answer
        |
        v
Calculate score
```

Never trust client-side scoring.

---

# 27. Test Answer Flow

Client:

```http
POST /api/attempts/attempt_100001/answer
```

Body:

```json
{
  "questionId": "q_100001",
  "selectedOption": "B"
}
```

Backend:

```text
Validate authentication
        |
Validate attempt
        |
Validate question belongs to test
        |
Validate test has not expired
        |
Save state
```

Do not calculate the final score for every answer.

---

# 28. Timer and Expiration

Do not trust the browser timer as the official timer.

The client timer is only UI.

Server state should contain:

```text
startedAt
expiresAt
duration
```

On submission:

```text
currentTime > expiresAt
```

must be handled according to the test rules.

This remains true whether Redis is used or not.

---

# 29. Prevent Double Submission

Users may click Submit twice.

Backend:

```text
Check attempt status

If submitted/completed:
    return existing result

Otherwise:
    process submission
    set status
    create result
```

The operation must be idempotent.

For important operations, use an idempotency key where appropriate.

---

# 30. Scoring

Keep scoring logic separate:

```text
src/modules/results/scoring.service.ts
```

Example:

```typescript
type ScoreInput = {
  correct: number;
  wrong: number;
  unanswered: number;
  positiveMarks: number;
  negativeMarks: number;
};

function calculateScore(input: ScoreInput) {
  return (
    input.correct * input.positiveMarks -
    input.wrong * input.negativeMarks
  );
}
```

Do not hardcode one marking rule for every exam.

Store exam/test-specific:

```text
positiveMarks
negativeMarks
partialMarking
```

---

# 31. Redis — Add Later

Redis should NOT become the primary database.

Use:

```text
MongoDB = permanent data
Redis   = temporary/high-speed state
```

Good Redis use cases:

```text
active test sessions
timers
temporary answers
rate limiting
caching
frequently accessed exam metadata
distributed locks
leaderboard-related temporary processing
```

Example:

```text
attempt:{attemptId}
```

Possible state:

```json
{
  "userId": "user_100001",
  "testId": "test-group4-001",
  "startedAt": "...",
  "expiresAt": "...",
  "currentQuestion": 42,
  "answers": {
    "q1": "B",
    "q2": "C",
    "q3": "A"
  }
}
```

Set an appropriate TTL.

---

# 32. BullMQ — Add Later

Use BullMQ for expensive work:

```text
Test submitted
     |
     v
Save result
     |
     v
Queue
     |
     +---- leaderboard
     +---- analytics
     +---- notification
     +---- report
```

Other jobs:

```text
email
PDF generation
bulk question import
AI question generation
question analysis
daily quiz generation
```

Do not force all of this into the Vercel request lifecycle.

---

# 33. Workers

When BullMQ becomes necessary, run workers separately from the Vercel web application.

Conceptually:

```text
Vercel
  |
  +-- Next.js Web/API
          |
          +---- MongoDB Atlas
          |
          +---- Redis/BullMQ
                    |
                    v
                 Worker
                    |
                    v
                 MongoDB
```

The worker can later run on a suitable container/server platform.

The important design rule is that the main application does not depend on worker-local memory.

---

# 34. Bulk Question Import

Because CareerNotification needs large amounts of 6th–12th content, build an import pipeline.

Sources/formats:

```text
CSV
Excel
JSON
Admin form
Bulk API
```

Recommended CSV fields:

```text
question
option_a
option_b
option_c
option_d
correct_answer
explanation_ta
explanation_en
class
subject
chapter
topic
difficulty
tags
source
```

Flow:

```text
Upload
  |
Validate
  |
Preview
  |
Detect duplicates
  |
Validate syllabus
  |
Import as Draft
  |
Review
  |
Publish
```

Never import directly as published.

Later, make this a BullMQ background job.

---

# 35. Admin Panel

Admin should have:

```text
Dashboard
 |
 +-- Exams
 +-- Exam Cycles
 +-- Exam Blueprints
 +-- Boards
 +-- Classes
 +-- Subjects
 +-- Chapters
 +-- Topics
 +-- Question Bank
 +-- Question Review
 +-- Test Series
 +-- Tests
 +-- Users
 +-- Reports
 +-- Payments
 +-- Analytics
```

Question filters:

```text
Board
Class
Subject
Chapter
Topic
Exam
Difficulty
Language
Status
Source
Year
Tags
```

Actions:

```text
Edit
Preview
Duplicate
Review
Approve
Publish
Archive
```

---

# 36. Question Quality Workflow

Use:

```text
Draft
  |
  v
Review
  |
  v
Approved
  |
  v
Published
  |
  v
Archived
```

If AI is used later:

```text
AI Generated
  |
  v
Draft
  |
  v
Human Review
  |
  v
Approved
  |
  v
Published
```

Store metadata such as:

```text
generatedBy
model
promptVersion
source
reviewStatus
reviewerId
```

Do not automatically publish AI-generated exam content.

---

# 37. Tamil + English Support

Because TNPSC is a major target, multilingual content should be first-class.

Use:

```json
{
  "ta": "...",
  "en": "..."
}
```

for:

```text
question
options
explanation
title
description
```

User preference:

```json
{
  "language": "ta"
}
```

API can return the requested language.

Do not create an inconsistent mixture of:

```text
questionTamil
questionEnglish
```

throughout every model when a standard multilingual object works.

---

# 38. Previous-Year Questions

Use metadata rather than a separate architecture.

Example:

```json
{
  "source": {
    "type": "previous_year",
    "examId": "tnpsc-group-4",
    "year": 2024
  }
}
```

This supports:

```text
TNPSC Group 4 2024 PYQ
TNPSC Group 4 2023 PYQ
SSC CGL 2025 PYQ
```

without duplicating the content model.

Ensure the content is legally usable before publishing.

---

# 39. Current Affairs

Keep current affairs separate from static syllabus content.

Collection:

```text
current_affairs
```

Then questions can reference current-affairs content.

Daily quiz should reuse existing questions rather than create a completely separate question bank.

---

# 40. Leaderboard

Do not store 100,000 users inside one test document.

Use:

```text
leaderboard_entries
```

Example:

```json
{
  "testId": "test-group4-001",
  "userId": "user1",
  "score": 95,
  "timeTakenSeconds": 5000,
  "rank": 1
}
```

Indexes:

```javascript
db.leaderboard_entries.createIndex({
  testId: 1,
  score: -1,
  timeTakenSeconds: 1
});

db.leaderboard_entries.createIndex(
  {
    testId: 1,
    userId: 1
  },
  {
    unique: true
  }
);
```

Do not calculate a full 100K-user rank synchronously during submission.

Queue it later.

---

# 41. User Performance

Eventually create:

```text
user_performance
```

Store aggregate statistics such as:

```text
testsAttempted
questionsAttempted
correct
wrong
averageScore
accuracy
subjectPerformance
```

Update asynchronously at scale.

Do not calculate the entire historical dataset on every dashboard request.

---

# 42. Bookmarks and Question Progress

Use:

```text
user_question_progress
```

Example:

```json
{
  "userId": "user_100001",
  "questionId": "q_100001",
  "bookmarked": true,
  "attemptCount": 3,
  "correctCount": 2,
  "lastAttemptedAt": "..."
}
```

Unique index:

```javascript
db.user_question_progress.createIndex(
  {
    userId: 1,
    questionId: 1
  },
  {
    unique: true
  }
);
```

---

# 43. Payments and Subscriptions

Keep these separate:

```text
subscriptions
payments
```

Never trust the frontend to tell the server that payment succeeded.

Use:

```text
Payment Provider
      |
      v
Webhook
      |
      v
Verify signature
      |
      v
Update payment
      |
      v
Activate subscription
```

This can later use queues for notifications and fulfillment.

---

# 44. Security

Minimum:

```text
HTTPS
Authentication
HttpOnly cookies where appropriate
CSRF protection where applicable
Rate limiting
Input validation
RBAC
Least-privilege MongoDB credentials
Environment variables
Audit logging
```

Never expose:

```text
MongoDB URI
Redis credentials
payment secret
JWT/auth secret
admin credentials
```

to the browser.

Never trust these from the browser:

```text
userId
testId
questionId
score
correctAnswer
```

Validate server-side.

---

# 45. RBAC

Recommended roles:

```text
student
editor
reviewer
admin
super_admin
```

Example:

```text
Student
  -> attempt tests
  -> view own results
  -> bookmark questions

Editor
  -> create/edit questions

Reviewer
  -> review/approve questions

Admin
  -> publish/manage tests/users

Super Admin
  -> everything
```

---

# 46. MongoDB Index Strategy

Do not index every field.

Indexes should match real query patterns.

Important examples:

```javascript
db.users.createIndex(
  { email: 1 },
  { unique: true, sparse: true }
);

db.exams.createIndex(
  { slug: 1 },
  { unique: true }
);

db.exam_cycles.createIndex({
  examId: 1,
  year: -1
});

db.questions.createIndex({
  syllabusNodeIds: 1
});

db.questions.createIndex({
  status: 1,
  difficulty: 1
});

db.test_questions.createIndex({
  testId: 1,
  order: 1
});

db.test_questions.createIndex(
  {
    testId: 1,
    questionId: 1
  },
  {
    unique: true
  }
);

db.attempts.createIndex({
  userId: 1,
  submittedAt: -1
});

db.results.createIndex({
  testId: 1,
  score: -1
});
```

Measure before adding more.

---

# 47. MongoDB Connection Management

Do not create a new database connection for every request.

Use a cached connection pattern appropriate for the deployment environment.

Conceptually:

```typescript
let cachedConnection;

export async function connectDB() {
  if (cachedConnection) {
    return cachedConnection;
  }

  cachedConnection = await mongoose.connect(
    process.env.MONGODB_URI!
  );

  return cachedConnection;
}
```

The exact implementation should be tested against the chosen Next.js/Vercel runtime.

---

# 48. Avoid N+1 Queries

Bad:

```text
Load test
 |
 +-- Q1 -> DB
 +-- Q2 -> DB
 +-- Q3 -> DB
 ...
 +-- Q100 -> DB
```

Better:

```text
Load test_questions
       |
       v
Collect question IDs
       |
       v
One indexed MongoDB query
```

This becomes especially important when many users take tests simultaneously.

---

# 49. Pagination

Never return 100,000 questions in one request.

Use:

```http
GET /api/questions?page=1&limit=50
```

For very large datasets, prefer cursor pagination:

```http
GET /api/questions?limit=50&after=<cursor>
```

Use pagination throughout admin and public APIs.

---

# 50. Search

As the question bank grows, use MongoDB Atlas Search or an appropriate search solution for:

```text
keyword search
Tamil search
English search
fuzzy search
autocomplete
```

Do not build a large question search system around uncontrolled regex queries.

---

# 51. CDN and File Storage

Use object storage for:

```text
PDFs
images
question diagrams
study materials
certificates
uploaded documents
```

Possible:

```text
AWS S3
Cloudflare R2
Cloudinary for image-heavy content
```

Do not store large files directly in MongoDB documents.

Use CDN delivery for large public assets.

---

# 52. Analytics

Do not run expensive analytics over production collections for every dashboard request.

Initial:

```text
MongoDB aggregation
```

Later:

```text
Production MongoDB
       |
       v
Queue / ETL
       |
       v
Analytics storage
```

Potential future choices depend on workload.

---

# 53. Events

Eventually you may track:

```text
test_started
question_viewed
answer_selected
question_marked
test_paused
test_submitted
result_viewed
question_reported
question_bookmarked
```

Do not put millions of events into one user document.

Use a separate event collection or analytics pipeline.

---

# 54. Question Reports

Allow users to report:

```text
Wrong answer
Wrong question
Typo
Duplicate
Image not loading
Translation issue
Other
```

Collection:

```text
question_reports
```

Admin can review and resolve these.

---

# 55. Duplicate Detection

As the question bank grows, exact duplicates become a problem.

Store:

```text
normalizedQuestion
questionHash
```

Example:

```text
who is known as the father of the indian constitution
```

Create a normalized hash such as SHA-256.

Exact duplicates can be detected using a unique index where appropriate.

Semantic duplicates can be addressed later with embeddings/vector search.

---

# 56. Content Copyright and Source Metadata

For question content, store:

```text
sourceType
sourceName
sourceUrl
sourceYear
license
createdBy
```

Do not blindly scrape and republish copyrighted textbook or coaching material.

Create original questions or use material you have rights to use.

---

# 57. Data Retention and Backups

Define retention rules for:

```text
active attempts
completed attempts
analytics events
audit logs
notifications
```

Use MongoDB Atlas backup capabilities appropriate to the selected tier.

Test restoration.

A backup that has never been restored is not a proven backup.

---

# 58. Monitoring

Monitor:

```text
API latency
5xx errors
MongoDB CPU
MongoDB memory
MongoDB connections
MongoDB slow queries
Redis memory
Redis hit rate
Queue depth
Worker failures
Test submissions/minute
Active attempts
```

For Vercel, also monitor application/function behavior and platform usage limits.

---

# 59. 100K Users — What Actually Matters?

100,000 registered users does NOT automatically mean you need sharding or multiple servers.

The important metrics are:

```text
registered users
concurrent users
simultaneous test takers
requests/second
writes/second
MongoDB connection count
query latency
Redis operations/second
queue depth
```

Example:

```text
100,000 registered
        |
10,000 online
        |
3,000 taking tests
```

is a very different workload from:

```text
100,000 registered
        |
300 online
        |
50 taking tests
```

Scale based on measured workload.

---

# 60. Scaling Path

## Stage 1 — Build

```text
Vercel
  |
  +-- Next.js frontend
  +-- Next.js API
        |
        v
   MongoDB Atlas
```

Focus on:

- data model
- content management
- test builder
- authentication
- test engine
- result calculation

## Stage 2 — Real test concurrency

Add:

```text
Redis
```

Use for:

- active test state
- temporary answers
- timers
- caching
- rate limiting

## Stage 3 — Heavy background work

Add:

```text
BullMQ
  |
  v
Worker
```

Use for:

- leaderboard
- analytics
- notifications
- bulk imports
- report generation
- email
- AI jobs

## Stage 4 — Revenue features

Add:

```text
Payments
Subscriptions
Premium content
Coupons
```

## Stage 5 — High traffic

Measure and then consider:

```text
additional compute
dedicated backend
multiple application instances
load balancing
dedicated workers
advanced database scaling
```

Do not introduce these simply because the user count sounds large.

---

# 61. When a Separate Backend Becomes Useful

Stay with Next.js until actual requirements justify extraction.

A dedicated backend may become useful if you have:

```text
Very high API traffic
+
Multiple mobile clients
+
Public API consumers
+
Heavy independent processing
+
Independent backend deployment needs
+
Multiple development teams
```

Then:

```text
                    API Gateway
                         |
             +-----------+-----------+
             |           |           |
          Next.js    Dedicated API  Workers
          Frontend    Service
                         |
                    MongoDB + Redis
```

Because the code is already separated into services/repositories, extraction becomes much easier.

---

# 62. Do NOT Start with Microservices

Avoid starting with:

```text
user-service
question-service
exam-service
test-service
result-service
payment-service
notification-service
```

as separate applications.

That adds:

- deployment complexity
- network failures
- service discovery
- distributed tracing
- multiple CI/CD pipelines
- inter-service authentication
- more monitoring

A modular monolith gives you:

- simple deployment
- clear architecture
- easy debugging
- shared types
- shared validation
- shared authentication
- easier refactoring

---

# 63. Final Data Relationship

```text
exam_categories
       |
       v
     exams
       |
       v
  exam_cycles
       |
       v
  test_series
       |
       v
     tests
       |
       v
 test_questions
       |
       v
   questions
       |
       v
 syllabus_nodes
```

User side:

```text
users
  |
  v
attempts
  |
  +----> attempt_answers
  |
  v
results
  |
  +----> leaderboard_entries
  |
  +----> user_performance
```

---

# 64. Content vs Assessment vs User Activity

This separation is fundamental.

```text
CONTENT
-------
questions
syllabus
subjects
chapters
topics
boards
classes

ASSESSMENT
----------
exam_blueprints
test_series
tests
test_questions

USER ACTIVITY
-------------
attempts
attempt_answers
results
bookmarks
performance
```

Do not mix these responsibilities.

---

# 65. TNPSC Content Strategy

Start with:

```text
TNPSC
|
+-- Group 4
|   |
|   +-- Tamil Eligibility-cum-Scoring
|   +-- General Studies
|   |   +-- General Science
|   |   +-- History
|   |   +-- Geography
|   |   +-- Indian Polity
|   |   +-- Indian Economy
|   |   +-- Current Affairs
|   |
|   +-- Aptitude & Mental Ability
|
+-- Group 2
|
+-- Group 1
|
+-- Technical Services
```

Then map relevant school content:

```text
Group 4 > Science
      |
      +-- Class 6 Science
      +-- Class 7 Science
      +-- Class 8 Science
      +-- Class 9 Science
      +-- Class 10 Science
```

This is a mapping, not duplicated question content.

---

# 66. 6th–12th Content Strategy

Use:

```text
Tamil Nadu State Board
|
+-- 6
|   +-- Tamil
|   +-- English
|   +-- Mathematics
|   +-- Science
|   +-- Social Science
|
+-- 7
|
+-- 8
|
+-- 9
|
+-- 10
|
+-- 11
|   +-- Physics
|   +-- Chemistry
|   +-- Biology
|   +-- Mathematics
|   +-- Computer Science
|
+-- 12
    +-- Physics
    +-- Chemistry
    +-- Biology
    +-- Mathematics
    +-- Computer Science
```

Do not assume every class has the same subject structure.

---

# 67. Practical First Milestone

Do NOT immediately load all 6th–12th content.

Build one vertical slice first:

```text
TNPSC
  |
Group 4
  |
2026
  |
Test Series
  |
Mock Test 01
  |
100 Questions
  |
Student
  |
Attempt
  |
Result
```

At the same time create a small school hierarchy:

```text
Tamil Nadu State Board
  |
Class 10
  |
Science
  |
Light
  |
Reflection
  |
10 Questions
```

Prove that the same question can be reused.

Then scale content ingestion.

---

# 68. Development Phases

## Phase 1 — Foundation

Build:

```text
1. Next.js project
2. Vercel deployment
3. MongoDB Atlas connection
4. Authentication
5. Admin authentication
6. RBAC
7. Board
8. Class
9. Subject
10. Chapter
11. Topic
12. Syllabus nodes
```

## Phase 2 — Question Bank

Build:

```text
1. Question CRUD
2. Question validation
3. Question review
4. Question approval
5. Question publishing
6. Bulk import
7. Duplicate detection
8. Question versioning
```

## Phase 3 — Exam Architecture

Build:

```text
1. Exam categories
2. Exams
3. Exam cycles
4. Exam blueprints
5. Test series
6. Tests
7. Test builder
8. Test questions
9. Publish workflow
```

## Phase 4 — Test Engine

Build:

```text
1. Test start
2. Attempt
3. Timer
4. Answer save
5. Mark for review
6. Navigation
7. Submit
8. Scoring
9. Result
```

Start without Redis if concurrency is low.

## Phase 5 — Redis

Add:

```text
1. Active attempt state
2. Timer state
3. Temporary answers
4. Cache
5. Rate limiting
```

## Phase 6 — BullMQ

Add:

```text
1. Leaderboard
2. Analytics
3. Notifications
4. Bulk import workers
5. Report generation
6. Email
7. AI jobs
```

## Phase 7 — Revenue

Add:

```text
1. Subscriptions
2. Payments
3. Premium tests
4. Coupons
5. Access control
```

## Phase 8 — Optimization

Add:

```text
1. Load testing
2. Monitoring
3. Slow query analysis
4. Performance optimization
5. CDN
6. Object storage
7. Additional compute only when required
```

---

# 69. Initial MongoDB Database

Database:

```text
careernotification
```

Initial collections:

```text
users
exam_categories
exams
exam_cycles
exam_blueprints

boards
classes
subjects
chapters
topics
syllabus_nodes

questions
question_versions

test_series
tests
test_questions

attempts
attempt_answers
results

subscriptions
payments
notifications
audit_logs
```

This is enough to build a serious MVP.

---

# 70. Golden Rules

## Rule 1
Do not duplicate questions for every exam.

## Rule 2
Do not put all users inside a test document.

## Rule 3
Do not put all attempts inside a user document.

## Rule 4
Do not trust client-side scoring.

## Rule 5
Do not expose correct answers before submission.

## Rule 6
Do not write every high-frequency event directly to MongoDB forever.

## Rule 7
Use Redis for high-frequency temporary state when needed.

## Rule 8
Use background workers for expensive calculations.

## Rule 9
Use indexes based on actual query patterns.

## Rule 10
Version questions and exam blueprints.

## Rule 11
Keep APIs stateless.

## Rule 12
Use pagination.

## Rule 13
Use object storage for large files.

## Rule 14
Use audit logs for content/admin changes.

## Rule 15
Build the content model before building hundreds of test screens.

## Rule 16
Do not pay for infrastructure before actual workload requires it.

---

# 71. Final Recommended Architecture

## NOW

```text
                         INTERNET
                            |
                            v
                         VERCEL
                            |
              +-------------+-------------+
              |                           |
        Next.js Frontend             Next.js API
              |                           |
              |                      Service Layer
              |                           |
              |                    Repository Layer
              |                           |
              +-------------+-------------+
                            |
                            v
                     MongoDB Atlas
```

## LATER

```text
                         INTERNET
                            |
                            v
                         VERCEL
                            |
              +-------------+-------------+
              |                           |
        Next.js Frontend             Next.js API
                                      |
                          +-----------+-----------+
                          |                       |
                     MongoDB Atlas              Redis
                                                  |
                                               BullMQ
                                                  |
                                                  v
                                               Worker
```

## MUCH LATER — ONLY IF NEEDED

```text
                         INTERNET
                            |
                            v
                       CDN / WAF
                            |
                            v
                    Application Layer
                            |
             +--------------+--------------+
             |              |              |
          Next.js       API Service      Workers
             |              |              |
             +--------------+--------------+
                            |
                    MongoDB + Redis
```

---

# 72. Bottom Line

The recommended long-term mental model is:

```text
                  REUSABLE CONTENT
                         |
              +----------+----------+
              |                     |
           SYLLABUS              QUESTIONS
              |                     |
              +----------+----------+
                         |
                    EXAM MAPPINGS
                         |
                    TEST SERIES
                         |
                       TESTS
                         |
                      ATTEMPTS
                         |
                       RESULTS
                         |
                    PERFORMANCE
```

And the infrastructure path is:

```text
START
Vercel + Next.js + MongoDB Atlas

        |
        v

WHEN NEEDED
+ Redis

        |
        v

WHEN BACKGROUND WORK GROWS
+ BullMQ + Workers

        |
        v

ONLY WHEN ACTUAL TRAFFIC REQUIRES
+ Additional backend/compute infrastructure
```

This lets CareerNotification grow from one exam to:

```text
TNPSC
SSC
Banking
UPSC
Railway
Technical exams
School exams
Daily quizzes
Current affairs
Previous-year papers
Mock tests
Paid test series
```

without redesigning the core database or application architecture.

---

# 73. Launch Checklist

```text
[ ] Next.js deployed to Vercel
[ ] MongoDB Atlas connected
[ ] MongoDB connection caching implemented
[ ] Authentication implemented
[ ] RBAC implemented
[ ] Board/Class/Subject/Chapter/Topic implemented
[ ] Syllabus nodes implemented
[ ] Question bank implemented
[ ] Question versioning implemented
[ ] Exam/Exam Cycle implemented
[ ] Exam Blueprint implemented
[ ] Test Series implemented
[ ] Test Builder implemented
[ ] Test Questions implemented
[ ] Attempt state machine implemented
[ ] Server-side timer validation implemented
[ ] Client cannot see answer key
[ ] Client cannot submit score
[ ] Double submission prevented
[ ] Server-side access control implemented
[ ] Pagination implemented
[ ] MongoDB indexes reviewed
[ ] Rate limiting planned/enabled
[ ] Backups enabled
[ ] Error monitoring configured
[ ] Load testing completed
[ ] Redis added when required
[ ] BullMQ added when required
[ ] Worker deployment added when required
```

---

# 74. Final Recommendation for CareerNotification

**Start small, but design the code correctly from day one.**

Use:

```text
Frontend:
Next.js

Backend:
Next.js Route Handlers

Hosting:
Vercel

Database:
MongoDB Atlas

Validation:
Zod

Architecture:
Modular Monolith

Later:
Redis

Later:
BullMQ + Workers

Later:
S3/R2

Much later, only if justified:
Separate backend / additional compute
```

The key architectural investment is **not AWS infrastructure**.

The key investment is:

```text
Reusable content model
+
Clean services
+
Clean repositories
+
Stateless API
+
Correct database indexes
+
Versioned questions
+
Versioned exam blueprints
+
Secure test engine
```

If these are correct, adding Redis, BullMQ, workers, or a dedicated backend later is an incremental infrastructure change rather than a complete rewrite.

---

# Source Documents Consolidated

This document consolidates the previously created CareerNotification database architecture and Next.js full-stack architecture plans, including the reusable question-bank model, test engine, MongoDB design, modular monolith structure, Redis/BullMQ evolution path, and 100K+ user scalability principles.
