# AI Fight Club - Deployment Guide

## Quick Start: Vercel + Neon

This guide covers deploying the full-stack AI Fight Club app to **Vercel** (frontend + serverless API) and **Neon** (PostgreSQL database).

---

## Prerequisites

- GitHub account with the repo pushed
- Vercel account (https://vercel.com)
- Neon account (https://neon.tech)

---

## Step 1: Set Up Neon Database

### 1.1 Create Neon Project
1. Go to https://console.neon.tech
2. Click "New Project"
3. Name it `ai-fight-club`
4. Select region closest to you
5. Click "Create Project"

### 1.2 Get Connection String
1. In Neon dashboard, click your project
2. Go to "Connection string"
3. Select "Node.js" from dropdown
4. Copy the connection string (looks like: `postgresql://user:password@host/dbname`)
5. Save it - you'll need this for Vercel

### 1.3 Initialize Database
1. In Neon, go to "SQL Editor"
2. Copy the entire content from `scripts/init-db.sql`
3. Paste into SQL Editor and run
4. The schema is now created

---

## Step 2: Deploy to Vercel

### 2.1 Connect GitHub Repository
1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Search for `ai-fight-club` and select it
4. Click "Import"

### 2.2 Configure Environment Variables
In the "Environment Variables" section, add:

```
DATABASE_URL=postgresql://user:password@host/dbname
JWT_SECRET=your-super-secret-random-string-here-min-32-chars
GITHUB_API_TOKEN=ghp_your_github_token_here
VITE_API_URL=https://your-vercel-domain.vercel.app
NODE_ENV=production
```

**How to generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.3 Deploy
1. Click "Deploy"
2. Wait for build to complete (5-10 minutes)
3. Once deployed, copy your Vercel domain (e.g., `ai-fight-club.vercel.app`)
4. Update `VITE_API_URL` to your actual domain

### 2.4 Seed Demo Data (Optional)
To populate with demo users and curriculum:

1. In Neon SQL Editor, run:
```sql
-- Create demo users
INSERT INTO "user" (id, name, email, password_hash, role, joined_date, timezone, is_blocked) VALUES
('1', 'Alice Chen', 'alice@example.com', '$2a$10$...', 'member', NOW(), 'UTC', FALSE),
('2', 'Bob Smith', 'bob@example.com', '$2a$10$...', 'member', NOW(), 'UTC', TRUE),
('3', 'Admin', 'admin@example.com', '$2a$10$...', 'admin', NOW(), 'UTC', FALSE);
```

Or use the seed script locally:
```bash
npm run db:seed
```

---

## Step 3: Verify Deployment

### 3.1 Test Frontend
1. Visit your Vercel domain
2. You should see the login page
3. Try signing up with a test account

### 3.2 Test API
```bash
curl https://your-domain.vercel.app/api/health
# Should return: {"status":"ok"}
```

### 3.3 Test Database Connection
1. Login with your test account
2. Go to Dashboard
3. If you see data loading, database is connected

---

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string from Neon | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | Secret for signing JWT tokens (min 32 chars) | Random hex string |
| `GITHUB_API_TOKEN` | GitHub API token for repo verification | `ghp_xxxxx` |
| `VITE_API_URL` | Frontend API base URL | `https://app.vercel.app` |
| `NODE_ENV` | Environment mode | `production` |

---

## Troubleshooting

### Build Fails with "Cannot find module"
- Clear Vercel cache: Go to Settings → Git → Clear Cache
- Redeploy

### Database Connection Error
- Verify `DATABASE_URL` is correct in Vercel env vars
- Check Neon project is active
- Ensure IP whitelist includes Vercel (Neon allows all by default)

### API Returns 500 Error
- Check Vercel logs: Deployments → Select deployment → Logs
- Verify `JWT_SECRET` is set
- Check database connection string

### Frontend Shows Blank Page
- Open browser DevTools → Console
- Check for CORS errors
- Verify `VITE_API_URL` is set correctly

---

## Production Checklist

- [ ] Database initialized with schema
- [ ] All environment variables set in Vercel
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] VITE_API_URL points to correct domain
- [ ] Test signup/login flow
- [ ] Test submission creation
- [ ] Test admin panel access
- [ ] Monitor Vercel logs for errors
- [ ] Set up Neon backups (Neon does this automatically)

---

## Monitoring & Maintenance

### View Logs
- **Vercel**: Deployments → Select deployment → Logs
- **Neon**: Dashboard → Monitoring

### Database Backups
- Neon automatically backs up hourly
- Access backups in Neon dashboard under "Backups"

### Performance
- Vercel provides analytics at https://vercel.com/dashboard
- Monitor API response times and database queries

---

## Scaling

### When to Upgrade
- **Neon**: Upgrade plan if hitting connection limits
- **Vercel**: Upgrade if hitting serverless function limits

### Optimization Tips
1. Add database indexes for frequently queried columns
2. Cache API responses with Redis (optional)
3. Use Vercel Edge Middleware for auth checks
4. Implement rate limiting on API endpoints

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **GitHub Issues**: https://github.com/mvvhmxd/ai-fight-club/issues

---

## Next Steps

1. Deploy to Vercel using this guide
2. Test all features
3. Set up custom domain (optional)
4. Configure email notifications (optional)
5. Set up monitoring and alerts (optional)
