# Heidi Platform - Emotional Support Companionship Marketplace

A production-ready two-sided marketplace connecting womxn and LGBTQIA community members with vetted providers for nonsexual emotional support and practical companionship.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Local Development Setup](#local-development-setup)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)
- [Business Model](#business-model)

## Overview

Heidi is a safety-first platform for nonsexual emotional companionship. Key principles:

- **Explicitly nonsexual**: Clear boundaries and consent-forward design
- **Safety & Trust**: Background checks, identity verification, safety reporting
- **Membership model**: Paid subscriptions for clients, platform fees for providers
- **Trauma-informed**: Boundary setting, clear communication, panic buttons

## Tech Stack

### Backend
- **Node.js** + **Express.js** + **TypeScript**
- **PostgreSQL** database
- **Prisma ORM** for type-safe database access
- **JWT** authentication
- **bcrypt** for password hashing

### Frontend
- **Next.js 14** (React framework)
- **TypeScript**
- **Tailwind CSS** for styling
- **React Hook Form** + **Zod** for forms and validation

### Infrastructure
- **Docker** + **Docker Compose** for local development
- **PostgreSQL 16** for production database
- Deployment-ready for **Vercel** (frontend) + **Render/Railway** (backend)

## Features

### Core Features
✅ User authentication (Client, Provider, Admin roles)
✅ Client profile management and membership subscriptions
✅ Provider profile creation and approval workflow
✅ Provider search with filters (location, service type, price, identity tags)
✅ Booking system with price calculation and platform fees
✅ Boundary summary and consent documentation
✅ In-app messaging scoped to bookings
✅ Review and rating system
✅ Safety reporting and Trust & Safety workflows
✅ Admin panel for provider approval, user management, and safety reports
✅ Policy document management

### Safety Features
- Multi-step provider vetting (identity verification, background checks)
- Boundary setting and session agreements
- In-app safety reporting with admin review workflows
- User suspension/ban capabilities
- Audit logging for critical actions

### Monetization
- **Client memberships**: Monthly ($29.99) and Yearly ($299.99) subscriptions
- **Platform fees**: 20% commission on bookings (minimum $5.00 per booking)
- Configurable fee structure via admin panel

## Project Structure

```
heidi-platform/
├── backend/
│   ├── src/
│   │   ├── server.ts              # Express server entry point
│   │   ├── routes/                # API route handlers
│   │   │   ├── auth.routes.ts     # Authentication endpoints
│   │   │   ├── client.routes.ts   # Client profile, search, membership
│   │   │   ├── provider.routes.ts # Provider profile, bookings
│   │   │   ├── booking.routes.ts  # Booking creation, messaging, reviews
│   │   │   ├── safety.routes.ts   # Safety reporting
│   │   │   ├── admin.routes.ts    # Admin management
│   │   │   └── public.routes.ts   # Public endpoints
│   │   └── utils/
│   │       ├── auth.ts            # JWT & authentication middleware
│   │       ├── pricing.ts         # Fee calculation logic
│   │       └── validation.ts      # Zod schemas
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── seed.ts                # Database seeding
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js 14 App Router pages
│   │   ├── components/            # React components
│   │   └── lib/
│   │       └── api.ts             # API client
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── .env.local.example
├── docker-compose.yml
└── README.md
```

## Local Development Setup

### Prerequisites
- Node.js 20+ 
- Docker & Docker Compose (recommended)
- PostgreSQL 16+ (if not using Docker)

### Quick Start with Docker (Recommended)

1. **Clone and navigate to project:**
```bash
cd heidi-platform
```

2. **Set up environment variables:**

Backend `.env`:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
```

Frontend `.env.local`:
```bash
cp frontend/.env.local.example frontend/.env.local
```

3. **Start all services:**
```bash
docker-compose up -d
```

4. **Initialize database:**
```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Seed database with initial data
docker-compose exec backend npm run prisma:seed
```

5. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Backend Health: http://localhost:3001/health

6. **Demo credentials:**
- Admin: `admin@heidi.com` / `admin123`

### Manual Setup (Without Docker)

1. **Install dependencies:**
```bash
# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..
```

2. **Set up PostgreSQL database:**
```bash
createdb heidi_db
```

3. **Configure environment variables:**
```bash
# backend/.env
DATABASE_URL="postgresql://postgres:password@localhost:5432/heidi_db?schema=public"
PORT=3001
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

4. **Run migrations and seed:**
```bash
cd backend
npx prisma migrate dev
npm run prisma:seed
cd ..
```

5. **Start development servers:**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Database Schema

### Key Models

- **User**: Authentication and role management (CLIENT, PROVIDER, ADMIN)
- **ClientProfile**: Client info, verification status, membership
- **ProviderProfile**: Provider info, services, rates, approval status
- **Membership**: Client subscription plans and status
- **ServiceType**: Available service offerings
- **Booking**: Session bookings with pricing and status
- **BoundarySummary**: Consent and boundary documentation per booking
- **Message**: In-app messaging scoped to bookings
- **Review**: Ratings and reviews (bidirectional)
- **SafetyReport**: Incident reporting with Trust & Safety workflow
- **AuditLog**: Critical action tracking
- **PolicyDocument**: Platform policies (Code of Conduct, Safety Guidelines)

See `backend/prisma/schema.prisma` for complete schema.

## API Documentation

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Client Endpoints (require CLIENT role)
- `POST /api/client/profile` - Create/update profile
- `GET /api/client/profile` - Get profile
- `GET /api/client/membership/plans` - List membership plans
- `POST /api/client/membership/subscribe` - Subscribe to plan
- `GET /api/client/providers/search` - Search providers (requires active membership)
- `GET /api/client/providers/:id` - Get provider details
- `GET /api/client/bookings` - List bookings

### Provider Endpoints (require PROVIDER role)
- `POST /api/provider/profile` - Submit provider application
- `GET /api/provider/profile` - Get profile
- `POST /api/provider/availability` - Add availability
- `DELETE /api/provider/availability/:id` - Remove availability
- `GET /api/provider/bookings` - List bookings
- `PATCH /api/provider/bookings/:id/status` - Accept/reject booking
- `GET /api/provider/earnings` - Earnings summary

### Booking Endpoints
- `POST /api/bookings` - Create booking (client, requires membership)
- `GET /api/bookings/:id` - Get booking details
- `POST /api/bookings/:id/boundary-summary` - Set boundaries
- `POST /api/bookings/messages` - Send message
- `GET /api/bookings/:id/messages` - Get messages
- `POST /api/bookings/:id/review` - Submit review

### Safety Endpoints
- `POST /api/safety/reports` - Create safety report
- `GET /api/safety/reports` - Get user's reports
- `GET /api/safety/reports/:id` - Get report details

### Admin Endpoints (require ADMIN role)
- `GET /api/admin/providers/pending` - List pending providers
- `PATCH /api/admin/providers/:id/approve` - Approve provider
- `PATCH /api/admin/providers/:id/reject` - Reject provider
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/status` - Suspend/ban/restore user
- `GET /api/admin/safety/reports` - List all safety reports
- `PATCH /api/admin/safety/reports/:id` - Update report status
- `GET /api/admin/stats` - Platform statistics

### Public Endpoints
- `GET /api/public/service-types` - List service types
- `GET /api/public/policies` - List policy documents
- `GET /api/public/policies/:slug` - Get specific policy

## Deployment

### Production Deployment Architecture

**Recommended Stack:**
- **Frontend**: Vercel (auto-scaling, edge network)
- **Backend**: Render or Railway (managed Node.js hosting)
- **Database**: Managed PostgreSQL (Render, Railway, or Supabase)

### Deploy Backend (Render/Railway)

1. **Create new Web Service**
2. **Connect GitHub repository**
3. **Configure build:**
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm start`
4. **Set environment variables:**
   ```
   DATABASE_URL=<your-production-database-url>
   NODE_ENV=production
   JWT_SECRET=<strong-random-secret>
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=https://your-frontend-domain.com
   PLATFORM_FEE_PERCENTAGE=20
   PLATFORM_FEE_MINIMUM_CENTS=500
   ```
5. **Run database migrations:**
   ```bash
   npx prisma migrate deploy
   npm run prisma:seed
   ```

### Deploy Frontend (Vercel)

1. **Import project from GitHub**
2. **Framework Preset**: Next.js
3. **Root Directory**: `frontend`
4. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-domain.com
   ```
5. **Deploy**

### Database Setup (Managed PostgreSQL)

1. **Create PostgreSQL database** (Render DB, Railway PostgreSQL, or Supabase)
2. **Get connection string**
3. **Add to backend environment** as `DATABASE_URL`
4. **Run migrations** from backend service

## Security Considerations

### Authentication & Authorization
- ✅ JWT-based authentication with secure secret
- ✅ Role-based access control (CLIENT, PROVIDER, ADMIN)
- ✅ Password hashing with bcrypt (10 rounds)
- ✅ Token expiration (7 days default)

### Data Protection
- ✅ Environment-based configuration (no hardcoded secrets)
- ✅ SQL injection protection via Prisma ORM
- ✅ Input validation with Zod schemas
- ✅ CORS configuration for frontend-only access

### Production Recommendations
- [ ] Implement rate limiting on all endpoints
- [ ] Add HTTPS/TLS for all communications
- [ ] Integrate real KYC provider (Stripe Identity, Onfido)
- [ ] Integrate real background check provider (Checkr, Certn)
- [ ] Implement refresh token rotation
- [ ] Add request signing for sensitive operations
- [ ] Set up monitoring and alerting (Sentry, DataDog)
- [ ] Regular security audits
- [ ] PII encryption at rest

### Trust & Safety
- Background check integration (stubbed in MVP)
- Safety reporting with admin review
- User suspension/ban capabilities
- Audit logging for accountability
- Message monitoring keywords (future enhancement)

## Business Model

### Revenue Streams

1. **Client Memberships**
   - Monthly: $29.99/month
   - Yearly: $299.99/year (17% savings)
   - Required for booking and messaging

2. **Platform Fees on Bookings**
   - 20% commission on completed bookings
   - Minimum $5.00 per booking
   - Provider receives 80% of base rate

### Example Booking Economics

Provider hourly rate: $60/hour
Session duration: 2 hours
Base cost: $120

```
Client pays: $144.00
Platform fee: $24.00 (20%)
Provider receives: $120.00
```

### Growth Metrics to Track

- Monthly Active Users (MAU)
- Membership conversion rate
- Average bookings per client/month
- Provider utilization rate
- Repeat booking rate
- Net Promoter Score (NPS)
- Trust & Safety report rate

### Estimated Operating Costs (MVP + 12 months)

**Development & Operations:**
- Engineering (initial build): $50k-$100k
- Monthly hosting (Vercel + Render + DB): $200-$500/month
- Background checks: $30-$50 per provider
- Identity verification: $1-$3 per user
- Customer support (part-time): $2k-$4k/month
- Trust & Safety reviewer (part-time): $2k-$4k/month
- Insurance (liability): $5k-$10k/year
- Legal (contracts, ToS): $10k-$20k

**Marketing:**
- Digital marketing: $5k-$15k/month
- Community partnerships: Variable
- Content creation: $2k-$5k/month

**Total MVP + 12-month runway: $150k-$300k**

### Break-even Analysis

Assuming:
- 1,000 active memberships @ $30/mo = $30k/month
- 500 bookings/month @ $5 avg platform fee = $2.5k/month
- **Total monthly revenue: $32.5k**

Monthly operating costs: ~$15k-$20k
**Break-even: ~600-700 active members**

## Next Steps & Roadmap

### Phase 1 - MVP (Current)
- ✅ Core authentication and profiles
- ✅ Provider search and booking
- ✅ Payment integration stubs
- ✅ Basic safety reporting
- ✅ Admin approval workflows

### Phase 2 - Production Readiness
- [ ] Integrate Stripe for payments
- [ ] Real KYC and background check providers
- [ ] SMS/email notifications
- [ ] Real-time messaging (WebSockets)
- [ ] Provider calendar integration
- [ ] Mobile-responsive UI refinement

### Phase 3 - Growth Features
- [ ] Video call capability (pre-session)
- [ ] Matching algorithm
- [ ] Provider certification program
- [ ] Client concierge service
- [ ] Provider training resources
- [ ] Community features

### Phase 4 - Scale & Expansion
- [ ] Multi-market expansion
- [ ] API for third-party integrations
- [ ] White-label licensing
- [ ] Corporate wellness partnerships

## License

Proprietary - All Rights Reserved

## Support

For questions or issues:
- Technical: engineering@heidi.com (placeholder)
- Trust & Safety: safety@heidi.com (placeholder)
- General: hello@heidi.com (placeholder)

---

**Built with care for emotional wellbeing and human connection. 💙**
