# Deployment Guide

## Quick Deployment Options

### Option 1: Render (Recommended for MVP)

#### Backend Deployment on Render

1. **Create PostgreSQL Database:**
   - Go to Render Dashboard → New → PostgreSQL
   - Choose plan (Starter $7/mo for MVP)
   - Save Internal Database URL

2. **Deploy Backend Service:**
   - New → Web Service
   - Connect GitHub repository
   - Settings:
     ```
     Name: heidi-backend
     Root Directory: backend
     Environment: Node
     Build Command: npm install && npx prisma generate && npm run build
     Start Command: npx prisma migrate deploy && npm start
     ```
   
3. **Environment Variables:**
   ```
   DATABASE_URL=<from step 1>
   NODE_ENV=production
   JWT_SECRET=<generate strong random string>
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=https://<your-vercel-domain>.vercel.app
   PLATFORM_FEE_PERCENTAGE=20
   PLATFORM_FEE_MINIMUM_CENTS=500
   PORT=3001
   ```

4. **After First Deploy:**
   - Access Render Shell
   - Run: `npm run prisma:seed`

#### Frontend Deployment on Vercel

1. **Import Project:**
   - New Project → Import from GitHub
   - Select repository

2. **Configure:**
   ```
   Framework Preset: Next.js
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

3. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com
   ```

4. **Deploy**

### Option 2: Railway

#### Full Stack on Railway

1. **Create New Project**

2. **Add PostgreSQL:**
   - New → Database → PostgreSQL
   - Note connection URL

3. **Deploy Backend:**
   - New → GitHub Repo → Select backend folder
   - Settings:
     ```
     Root Directory: backend
     Build Command: npm install && npx prisma generate && npm run build
     Start Command: npm start
     ```
   - Environment Variables (same as Render)

4. **Deploy Frontend:**
   - New → GitHub Repo → Select frontend folder
   - Settings:
     ```
     Root Directory: frontend
     Build Command: npm run build
     Start Command: npm start
     ```
   - Environment Variables:
     ```
     NEXT_PUBLIC_API_URL=${{backend.url}}
     ```

### Option 3: Docker Deployment (VPS/Cloud)

#### Prerequisites
- VPS with Docker & Docker Compose (e.g., DigitalOcean Droplet)
- Domain name configured

#### Steps

1. **SSH into server:**
```bash
ssh user@your-server-ip
```

2. **Install Docker & Docker Compose:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo apt-get install docker-compose-plugin
```

3. **Clone repository:**
```bash
git clone https://github.com/your-org/heidi-platform.git
cd heidi-platform
```

4. **Configure production environment:**

Create `backend/.env`:
```env
DATABASE_URL=postgresql://heidi_user:STRONG_PASSWORD@postgres:5432/heidi_db?schema=public
PORT=3001
NODE_ENV=production
JWT_SECRET=GENERATE_STRONG_RANDOM_SECRET
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-domain.com
PLATFORM_FEE_PERCENTAGE=20
PLATFORM_FEE_MINIMUM_CENTS=500
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

5. **Update docker-compose for production:**

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: heidi_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: heidi_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - heidi-network
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://heidi_user:${POSTGRES_PASSWORD}@postgres:5432/heidi_db?schema=public
      PORT: 3001
      NODE_ENV: production
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: ${FRONTEND_URL}
    networks:
      - heidi-network
    depends_on:
      - postgres
    restart: unless-stopped
    command: sh -c "npx prisma migrate deploy && npm start"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    networks:
      - heidi-network
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    networks:
      - heidi-network
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

networks:
  heidi-network:

volumes:
  postgres_data:
```

6. **Create nginx configuration:**

Create `nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }

    upstream backend {
        server backend:3001;
    }

    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;
        
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }

    server {
        listen 80;
        server_name api.your-domain.com;
        
        location / {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

7. **Deploy:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

8. **Seed database:**
```bash
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:seed
```

9. **Set up SSL with Let's Encrypt:**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com -d api.your-domain.com
```

## Post-Deployment Checklist

- [ ] Verify all environment variables are set correctly
- [ ] Database migrations completed successfully
- [ ] Database seeded with initial data (membership plans, service types, policies)
- [ ] Test user registration and login
- [ ] Test provider application flow
- [ ] Test client membership purchase (mock payment)
- [ ] Test booking creation
- [ ] Test safety reporting
- [ ] Verify admin can approve providers
- [ ] Check all API endpoints return expected responses
- [ ] Frontend loads correctly on multiple devices
- [ ] SSL certificate installed and auto-renewal configured
- [ ] Database backups configured
- [ ] Monitoring and error tracking set up (Sentry recommended)
- [ ] DNS configured correctly
- [ ] CORS settings allow frontend domain
- [ ] Rate limiting enabled (if implemented)

## Monitoring & Maintenance

### Set up Monitoring (Recommended)

1. **Error Tracking:**
   - Install Sentry for both frontend and backend
   - Configure error notifications

2. **Uptime Monitoring:**
   - Use UptimeRobot or Pingdom
   - Monitor both frontend and backend health endpoints

3. **Database Monitoring:**
   - Monitor connection pool usage
   - Set up slow query logging
   - Configure automated backups

4. **Application Metrics:**
   - Track API response times
   - Monitor memory and CPU usage
   - Set up alerts for anomalies

### Backup Strategy

#### Database Backups (Critical)

**Render/Railway:**
- Automatic daily backups included
- Test restore process monthly

**Self-hosted:**
```bash
# Automated backup script (add to cron)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U heidi_user heidi_db > backup_$DATE.sql
# Upload to S3 or secure storage
```

#### Code Backups
- GitHub repository serves as version control
- Tag releases: `git tag v1.0.0`

## Scaling Considerations

### Horizontal Scaling (Future)

1. **Load Balancer:**
   - Add multiple backend instances
   - Use Nginx or cloud load balancer

2. **Database:**
   - Read replicas for heavy read operations
   - Connection pooling (PgBouncer)

3. **Caching:**
   - Redis for session management
   - Cache provider profiles and service types

4. **CDN:**
   - CloudFlare for frontend assets
   - Reduce server load

### Vertical Scaling (Immediate)

- Start with: 1 CPU, 1GB RAM
- Scale to: 2 CPU, 2GB RAM as user base grows
- Monitor and adjust based on metrics

## Troubleshooting

### Common Issues

**Backend won't start:**
- Check DATABASE_URL is correct
- Verify Prisma migrations ran: `npx prisma migrate deploy`
- Check logs: `docker-compose logs backend`

**Frontend can't connect to backend:**
- Verify NEXT_PUBLIC_API_URL is set correctly
- Check CORS settings in backend
- Verify backend is accessible from frontend domain

**Database connection errors:**
- Check connection string format
- Verify database is running
- Check firewall rules allow connections

**"Invalid token" errors:**
- Verify JWT_SECRET matches between deployments
- Check token hasn't expired
- Clear browser localStorage and re-login

## Security Hardening

### Production Security Checklist

- [ ] Change all default passwords
- [ ] Use strong, unique JWT_SECRET
- [ ] Enable HTTPS only
- [ ] Set secure cookie flags
- [ ] Implement rate limiting
- [ ] Add request validation middleware
- [ ] Set up WAF (Web Application Firewall)
- [ ] Regular dependency updates
- [ ] Penetration testing before launch
- [ ] GDPR/CCPA compliance review
- [ ] Privacy policy and ToS updated

## Cost Estimation

### Render + Vercel (Recommended for Launch)

**Monthly Costs:**
- Render PostgreSQL Starter: $7
- Render Web Service (Starter): $7
- Vercel Pro (optional): $20
- **Total: $14-$34/month**

**As you scale (100+ active users):**
- Render PostgreSQL Standard: $20
- Render Web Service (Standard): $25
- Vercel Pro: $20
- **Total: $65/month**

### Railway

**Monthly Costs:**
- PostgreSQL: $5
- Backend service: $5-10
- Frontend service: $5-10
- **Total: $15-25/month**

### Self-hosted VPS

**Monthly Costs:**
- DigitalOcean Droplet (2GB): $12
- Database backups storage: $5
- Domain: $12/year
- SSL: Free (Let's Encrypt)
- **Total: $17-20/month**

## Support & Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Review error logs
- Check system health metrics
- Review safety reports

**Monthly:**
- Update dependencies
- Review and optimize database
- Test backup restoration
- Security updates

**Quarterly:**
- Performance audit
- Security audit
- User feedback review
- Feature roadmap update

---

For urgent issues during deployment, refer to:
- Backend logs: `docker-compose logs -f backend`
- Frontend logs: `docker-compose logs -f frontend`
- Database logs: `docker-compose logs -f postgres`
