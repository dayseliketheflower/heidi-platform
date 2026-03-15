# Heidi Platform - Technical Architecture

## System Overview

Heidi is a three-tier web application built for scalability, security, and maintainability:

```
┌─────────────────────────────────────────────────────────────┐
│                      Users (Web Browser)                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Frontend (Next.js 14)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • React Components (TypeScript)                      │   │
│  │ • Tailwind CSS Styling                               │   │
│  │ • React Hook Form + Zod Validation                   │   │
│  │ • Axios API Client                                   │   │
│  │ • JWT Token Management                               │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (Node.js + Express)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Authentication & Authorization (JWT)                 │   │
│  │ ├─ Role-based access control (CLIENT/PROVIDER/ADMIN)│   │
│  │ └─ Membership enforcement middleware                 │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Business Logic Layers                                │   │
│  │ ├─ Client Management                                 │   │
│  │ ├─ Provider Management                               │   │
│  │ ├─ Booking & Pricing Engine                          │   │
│  │ ├─ Messaging System                                  │   │
│  │ ├─ Trust & Safety                                    │   │
│  │ └─ Admin Operations                                  │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Data Access Layer (Prisma ORM)                       │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ SQL
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Database (PostgreSQL 16)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 20+ Tables with Relational Integrity                 │   │
│  │ • Users & Profiles (Client/Provider)                 │   │
│  │ • Memberships & Subscriptions                        │   │
│  │ • Bookings & Transactions                            │   │
│  │ • Messages & Reviews                                 │   │
│  │ • Safety Reports & Audit Logs                        │   │
│  │ • Service Types & Policies                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

External Services (Stubbed in MVP):
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Stripe     │  │  KYC/IDV     │  │  Background  │
│   Payment    │  │  Provider    │  │  Checks      │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.3
- **UI Library**: React 18.2
- **Styling**: Tailwind CSS 3.4
- **Form Management**: React Hook Form 7.49
- **Validation**: Zod 3.22
- **HTTP Client**: Axios 1.6
- **Icons**: Lucide React 0.303

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js 4.18
- **Language**: TypeScript 5.3
- **ORM**: Prisma 5.8
- **Authentication**: JWT (jsonwebtoken 9.0)
- **Password Hashing**: bcrypt 5.1
- **Validation**: Zod 3.22 + express-validator 7.0
- **Logging**: Morgan 1.10

### Database
- **RDBMS**: PostgreSQL 16
- **Features Used**:
  - JSONB columns for flexible data
  - Enums for type safety
  - Indexes for query performance
  - Foreign keys with cascading deletes
  - Transactions for data integrity

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Development**: Hot reload for both frontend and backend
- **Production**: 
  - Frontend: Vercel (recommended) or self-hosted
  - Backend: Render/Railway (recommended) or VPS
  - Database: Managed PostgreSQL

## Data Model Overview

### Core Entities

#### User Management
```
User (authentication & role)
├─ ClientProfile (1:1)
│  └─ Membership (1:1)
│     └─ MembershipPlan (N:1)
└─ ProviderProfile (1:1)
   └─ ProviderAvailability (1:N)
```

#### Booking Flow
```
Booking
├─ Client (ClientProfile)
├─ Provider (ProviderProfile)
├─ ServiceType
├─ BoundarySummary (1:1)
├─ Messages (1:N)
└─ Reviews (1:N)
```

#### Trust & Safety
```
SafetyReport
├─ Reporter (User)
├─ ReportedUser (User)
└─ Booking (optional)

AuditLog
├─ Actor (User)
└─ Metadata (JSONB)
```

### Key Relationships

- **One-to-One**: User ↔ ClientProfile, User ↔ ProviderProfile, ClientProfile ↔ Membership, Booking ↔ BoundarySummary
- **One-to-Many**: Provider → Bookings, Client → Bookings, Booking → Messages, Booking → Reviews
- **Many-to-Many** (via arrays): Provider → ServiceTypes, Provider → IdentityTags

## API Architecture

### REST Endpoints Structure

```
/api
├─ /auth
│  ├─ POST /signup              (public)
│  ├─ POST /login               (public)
│  ├─ GET  /me                  (authenticated)
│  └─ POST /refresh             (authenticated)
│
├─ /client                      (CLIENT role required)
│  ├─ POST /profile
│  ├─ GET  /profile
│  ├─ GET  /membership/plans
│  ├─ POST /membership/subscribe
│  ├─ GET  /providers/search    (+ active membership)
│  ├─ GET  /providers/:id       (+ active membership)
│  └─ GET  /bookings
│
├─ /provider                    (PROVIDER role required)
│  ├─ POST   /profile
│  ├─ GET    /profile
│  ├─ POST   /availability
│  ├─ DELETE /availability/:id
│  ├─ GET    /bookings
│  ├─ PATCH  /bookings/:id/status
│  └─ GET    /earnings
│
├─ /bookings                    (authenticated)
│  ├─ POST /                    (CLIENT + membership)
│  ├─ GET  /:id
│  ├─ POST /:id/boundary-summary
│  ├─ POST /messages
│  ├─ GET  /:id/messages
│  └─ POST /:id/review
│
├─ /safety                      (authenticated)
│  ├─ POST /reports
│  ├─ GET  /reports
│  └─ GET  /reports/:id
│
├─ /admin                       (ADMIN role required)
│  ├─ GET   /providers/pending
│  ├─ PATCH /providers/:id/approve
│  ├─ PATCH /providers/:id/reject
│  ├─ GET   /users
│  ├─ PATCH /users/:id/status
│  ├─ GET   /safety/reports
│  ├─ PATCH /safety/reports/:id
│  ├─ GET   /membership-plans
│  ├─ POST  /membership-plans
│  └─ GET   /stats
│
└─ /public                      (public)
   ├─ GET /service-types
   ├─ GET /policies
   ├─ GET /policies/:slug
   └─ GET /platform-config
```

### Authentication Flow

```
1. User Registration
   POST /api/auth/signup
   ├─ Validate email, password, role
   ├─ Hash password (bcrypt, 10 rounds)
   ├─ Create user with PENDING_VERIFICATION status
   ├─ Generate JWT token
   └─ Return token + user data

2. Login
   POST /api/auth/login
   ├─ Validate credentials
   ├─ Check user status (not BANNED)
   ├─ Generate JWT token
   └─ Return token + user data

3. Authenticated Requests
   GET /api/* (with Authorization: Bearer <token>)
   ├─ Extract token from header
   ├─ Verify JWT signature
   ├─ Decode user ID + role
   ├─ Attach to req.user
   └─ Proceed to route handler

4. Role Authorization
   middleware: authorize(ADMIN, CLIENT)
   ├─ Check req.user.role
   ├─ If authorized: proceed
   └─ Else: 403 Forbidden
```

## Booking & Pricing Engine

### Price Calculation Algorithm

```typescript
Input: 
  - Provider hourly rate (in cents)
  - Session duration (in minutes)

Calculation:
  1. basePrice = hourlyRate * (duration / 60)
  2. platformFee = max(
       basePrice * platformFeePercentage / 100,
       minimumPlatformFee
     )
  3. priceTotal = basePrice + platformFee
  4. providerPayout = basePrice

Output:
  {
    priceTotal: number,      // What client pays
    platformFee: number,     // Platform's revenue
    providerPayout: number   // What provider receives
  }
```

Example:
```
Provider rate: $60/hour (6000 cents)
Duration: 2 hours (120 minutes)
Platform fee: 20% (minimum $5.00)

basePrice = 6000 * (120 / 60) = 12,000 cents ($120)
platformFee = max(12,000 * 0.20, 500) = 2,400 cents ($24)
priceTotal = 12,000 + 2,400 = 14,400 cents ($144)
providerPayout = 12,000 cents ($120)
```

### Booking State Machine

```
        ┌─────────────┐
        │  REQUESTED  │ ◄─── Client creates booking
        └──────┬──────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
  ┌─────────┐    ┌─────────┐
  │ACCEPTED │    │REJECTED │
  └────┬────┘    └─────────┘
       │
       │ (session happens)
       │
       ▼
  ┌───────────┐
  │ COMPLETED │ ──► Reviews can be left
  └───────────┘

  Cancellations (from any state):
  ├─ CANCELLED_BY_CLIENT
  └─ CANCELLED_BY_PROVIDER
```

## Security Architecture

### Authentication & Authorization

1. **Password Security**
   - bcrypt hashing with 10 salt rounds
   - Minimum 8 characters required
   - Stored hashed, never plain text

2. **JWT Tokens**
   - HS256 algorithm
   - 7-day expiration
   - Payload: { userId, email, role }
   - Secret stored in environment variable

3. **Role-Based Access Control (RBAC)**
   ```
   CLIENT privileges:
   ├─ Create profile
   ├─ Purchase membership
   ├─ Search providers (with membership)
   ├─ Create bookings (with membership)
   └─ Send messages

   PROVIDER privileges:
   ├─ Submit application
   ├─ Manage profile & availability
   ├─ View bookings
   ├─ Accept/reject bookings
   └─ Send messages

   ADMIN privileges:
   ├─ All CLIENT & PROVIDER privileges
   ├─ Approve/reject providers
   ├─ Suspend/ban users
   ├─ View all safety reports
   └─ Manage platform configuration
   ```

4. **Membership Enforcement**
   - Middleware checks active membership
   - Required for: provider search, booking creation, messaging
   - Validates: status=ACTIVE and endDate >= now

### Data Protection

1. **Input Validation**
   - Zod schemas on both frontend and backend
   - Type-safe validation
   - Sanitization of user inputs

2. **SQL Injection Prevention**
   - Prisma ORM parameterized queries
   - No raw SQL in application code

3. **CORS Configuration**
   - Whitelist frontend domain only
   - Credentials enabled for cookies

4. **Environment Variables**
   - Sensitive config in .env (git-ignored)
   - Different secrets for dev/staging/prod

### Privacy Considerations

- Minimal PII collection
- No medical data storage
- Clear data retention policies needed
- GDPR/CCPA compliance review required

## Scalability Considerations

### Current Architecture (MVP)
- **Concurrent Users**: 100-500
- **Requests/Second**: ~10-50
- **Database**: Single PostgreSQL instance
- **Hosting**: Shared resources

### Growth Path (1,000-10,000 users)

1. **Database Optimizations**
   - Add read replicas for heavy read operations
   - Implement connection pooling (PgBouncer)
   - Add Redis caching layer

2. **Backend Scaling**
   - Horizontal scaling with load balancer
   - Stateless design enables easy replication
   - Session management via JWT (no server state)

3. **Frontend Optimizations**
   - CDN for static assets
   - Image optimization
   - Code splitting

4. **Caching Strategy**
   ```
   Cache Layer (Redis):
   ├─ Provider profiles (15 min TTL)
   ├─ Service types (1 hour TTL)
   ├─ Policy documents (1 hour TTL)
   └─ Search results (5 min TTL)
   ```

### Performance Targets

- **API Response Time**: <200ms (p95)
- **Page Load Time**: <2s (First Contentful Paint)
- **Database Queries**: <50ms (p95)
- **Uptime**: 99.9%

## Testing Strategy

### Unit Tests (Backend)
```javascript
describe('Pricing Calculator', () => {
  it('calculates correct breakdown for 2-hour session');
  it('enforces minimum platform fee');
  it('handles edge cases (very short/long sessions)');
});

describe('Authentication Middleware', () => {
  it('rejects invalid tokens');
  it('enforces role requirements');
  it('blocks banned users');
});
```

### Integration Tests (Backend)
```javascript
describe('Booking Flow', () => {
  it('creates booking with valid membership');
  it('blocks booking without membership');
  it('calculates prices correctly');
  it('prevents double-booking');
});
```

### E2E Tests (Frontend)
```javascript
describe('User Journey', () => {
  it('client can signup, subscribe, and book');
  it('provider can apply and get approved');
  it('safety report can be submitted');
});
```

## Monitoring & Observability

### Application Metrics
- Request rate (per endpoint)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Active user count

### Business Metrics
- New signups/day
- Membership conversion rate
- Bookings created/completed
- Average session price
- Provider approval rate
- Safety report frequency

### Logging Strategy
```
Development: 
├─ Console logging (Morgan 'dev' format)
└─ Detailed error stack traces

Production:
├─ Structured JSON logging
├─ Error tracking (Sentry recommended)
├─ Audit logs for critical actions
└─ Performance monitoring (APM)
```

## Deployment Architecture

### Recommended Production Setup

```
Internet
   │
   ├─ CloudFlare (CDN + DDoS Protection)
   │
   ├─► Vercel (Frontend)
   │   └─ Next.js App
   │
   └─► Render (Backend)
       ├─ Express API
       └─ PostgreSQL Database
```

### Environment Configuration

```
Development:
├─ localhost:3000 (frontend)
├─ localhost:3001 (backend)
└─ localhost:5432 (postgres)

Staging:
├─ staging.heidi.com (frontend)
├─ api-staging.heidi.com (backend)
└─ Managed PostgreSQL (staging DB)

Production:
├─ heidi.com (frontend)
├─ api.heidi.com (backend)
└─ Managed PostgreSQL (production DB with backups)
```

## Future Enhancements

### Phase 2 Features
- Real-time messaging (WebSocket)
- Push notifications
- Video call integration (pre-session)
- Mobile apps (React Native)
- Automated booking reminders
- Provider calendar sync

### Phase 3 Features
- ML-based matching algorithm
- Sentiment analysis on messages
- Fraud detection system
- Multi-language support
- Corporate wellness partnerships
- API for third-party integrations

---

**Last Updated**: 2024
**Version**: 1.0 (MVP)
