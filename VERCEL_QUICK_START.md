# Vercel + Neon Quick Start (5 Minutes)

## 🚀 Deploy in 5 Steps

### Step 1: Create Neon Database (2 min)
1. Go to https://console.neon.tech
2. Click "New Project" → Name it `ai-fight-club`
3. Click "Connection string" → Copy (looks like `postgresql://user:pass@host/db`)

### Step 2: Initialize Schema (1 min)
1. In Neon, go to "SQL Editor"
2. Copy all SQL from `scripts/init-db.sql`
3. Paste and run in SQL Editor
4. Done! Schema is created.

### Step 3: Deploy to Vercel (1 min)
1. Go to https://vercel.com/new
2. Select "Import Git Repository"
3. Search and select `ai-fight-club`
4. Click "Import"

### Step 4: Add Environment Variables (1 min)
Add these in Vercel's "Environment Variables" section:

```
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET=your-random-secret-here
GITHUB_API_TOKEN=ghp_your_token_here
VITE_API_URL=https://your-vercel-domain.vercel.app
NODE_ENV=production
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Deploy (1 min)
1. Click "Deploy"
2. Wait 5-10 minutes for build
3. Visit your domain!

---

## ✅ Verify It Works

1. **Frontend**: Visit your Vercel domain → See login page ✓
2. **API**: Visit `https://your-domain.vercel.app/api/health` → See `{"status":"ok"}` ✓
3. **Database**: Sign up → Check if user created ✓

---

## 🔑 Demo Accounts (After Seeding)

```
alice@example.com / password123
bob@example.com / password123
admin@example.com / admin123
```

To seed data, run in Neon SQL Editor:
```sql
-- Copy content from scripts/neon-init.md
```

---

## 🆘 Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Clear cache: Settings → Git → Clear Cache → Redeploy |
| Database error | Check DATABASE_URL in Vercel env vars |
| API returns 500 | Check Vercel logs: Deployments → Logs |
| Blank page | Check browser console for CORS errors |

---

## 📚 Full Guide

See `DEPLOYMENT.md` for detailed instructions and troubleshooting.

---

## 🎉 You're Done!

Your AI Fight Club app is now live on Vercel with Neon database!

**Next Steps:**
- [ ] Test signup/login
- [ ] Create submissions
- [ ] Test admin panel
- [ ] Invite team members
- [ ] Configure custom domain (optional)
