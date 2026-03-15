# Quick Start Guide - Heidi Platform

## 🚀 Get Running in 5 Minutes

### Option 1: Docker (Recommended)

**Prerequisites:** Docker Desktop installed

```bash
# Navigate to project
cd heidi-platform

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# Start everything
docker-compose up -d

# Wait 30 seconds for services to start, then initialize database
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npm run prisma:seed

# Done! Access the app
# Frontend: http://localhost:3000
# Backend: http://localhost:3001/health
# Demo Admin: admin@heidi.com / admin123
```

### Option 2: Manual Setup

**Prerequisites:** Node.js 20+, PostgreSQL 16+

```bash
# 1. Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Setup database
createdb heidi_db

# 3. Configure environment
# Edit backend/.env with your DATABASE_URL
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# 4. Run migrations and seed
cd backend
npx prisma migrate dev
npm run prisma:seed
cd ..

# 5. Start development servers (in separate terminals)
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev

# Access: http://localhost:3000
```

## 📱 Test the Platform

### 1. Create Admin Account (if not seeded)
```bash
# Already done if you ran seed script
# Admin: admin@heidi.com / admin123
```

### 2. Register as Client
- Go to http://localhost:3000
- Click "Get Started"
- Email: client@test.com, Password: password123, Role: CLIENT
- Complete profile
- Subscribe to Monthly Membership ($29.99)

### 3. Register as Provider
- New browser/incognito window
- Sign up with provider@test.com / password123 / PROVIDER role
- Complete provider application
- Switch to admin account
- Approve provider at http://localhost:3000/admin/providers

### 4. Create a Booking
- As client, search for providers
- Select provider
- Create booking for "Emotional Support Session"
- Set boundaries
- Provider accepts booking
- Exchange messages
- Complete session
- Leave review

## 🔑 Key Endpoints

**Frontend:**
- Landing: http://localhost:3000
- Login: http://localhost:3000/login
- Signup: http://localhost:3000/signup

**Backend API:**
- Health: http://localhost:3001/health
- Swagger Docs: (not implemented in MVP, use README for API docs)

## 📂 Project Structure

```
heidi-platform/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── utils/          # Auth, pricing, validation
│   │   └── server.ts       # Main entry point
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.ts         # Initial data
│   └── package.json
│
├── frontend/                # Next.js frontend
│   ├── src/
│   │   ├── app/            # Pages (App Router)
│   │   ├── components/     # React components
│   │   └── lib/api.ts      # API client
│   └── package.json
│
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
│
├── docker-compose.yml       # Local dev environment
└── README.md                # Full documentation
```

## 🛠️ Common Commands

```bash
# Backend
npm run dev              # Start dev server with hot reload
npm run build            # Build TypeScript
npm start                # Start production server
npx prisma studio        # Open Prisma Studio (DB GUI)
npx prisma migrate dev   # Create new migration

# Frontend  
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm start                # Start production server

# Docker
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose logs -f backend    # View backend logs
docker-compose exec backend sh    # Access backend shell
```

## 🐛 Troubleshooting

**Backend won't start:**
```bash
# Check database connection
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
docker-compose exec backend npx prisma migrate dev
docker-compose exec backend npm run prisma:seed
```

**"Invalid token" errors:**
```bash
# Clear browser localStorage
# In browser console:
localStorage.clear()
# Then refresh and login again
```

**Port already in use:**
```bash
# Change ports in docker-compose.yml:
# Frontend: "3001:3000" instead of "3000:3000"
# Backend: "3002:3001" instead of "3001:3001"
```

**Database migration issues:**
```bash
# Reset Prisma
cd backend
rm -rf prisma/migrations
rm -rf node_modules/.prisma
npx prisma migrate dev --name init
```

## 📚 Next Steps

1. **Read the full README.md** for complete documentation
2. **Review ARCHITECTURE.md** to understand the system design
3. **Check DEPLOYMENT.md** for production deployment guides
4. **Explore the API** by reading route files in `backend/src/routes/`
5. **Customize the frontend** by editing pages in `frontend/src/app/`

## 🎯 Key Features to Test

- ✅ User authentication (Client, Provider, Admin)
- ✅ Provider approval workflow
- ✅ Membership subscriptions
- ✅ Provider search with filters
- ✅ Booking creation with pricing
- ✅ Boundary setting
- ✅ In-app messaging
- ✅ Reviews and ratings
- ✅ Safety reporting
- ✅ Admin dashboard

## 💡 Tips

- Use Prisma Studio (`npx prisma studio`) to view/edit database
- Check `backend/.env` for configuration
- Frontend API calls are in `frontend/src/lib/api.ts`
- Backend routes are organized by user role
- All prices are stored in cents (multiply by 100)

## 🆘 Getting Help

- Review code comments in source files
- Check console logs in browser DevTools
- View backend logs: `docker-compose logs -f backend`
- Verify environment variables are set correctly

---

**You're all set!** Start exploring the Heidi Platform. 💙
