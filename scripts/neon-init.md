# Neon Database Setup

## Quick Setup for Vercel + Neon

### 1. Create Neon Project
1. Go to https://console.neon.tech
2. Click "New Project"
3. Name: `ai-fight-club`
4. Select your region
5. Click "Create Project"

### 2. Get Connection String
1. In Neon dashboard, click your project
2. Click "Connection string"
3. Select "Node.js" from dropdown
4. Copy the full connection string

### 3. Initialize Database Schema
**Option A: Using Neon SQL Editor (Easiest)**
1. In Neon dashboard, go to "SQL Editor"
2. Open `scripts/init-db.sql` from this repo
3. Copy the entire SQL content
4. Paste into Neon SQL Editor
5. Click "Execute"
6. Schema is now created!

**Option B: Using psql (Command Line)**
```bash
psql "your-connection-string-here" -f scripts/init-db.sql
```

### 4. Add to Vercel
1. Go to your Vercel project settings
2. Go to "Environment Variables"
3. Add: `DATABASE_URL=your-connection-string`
4. Redeploy

### 5. Seed Demo Data (Optional)
To add demo users and curriculum:

**Option A: Using Neon SQL Editor**
1. In Neon SQL Editor, run:
```sql
-- Create demo users with hashed passwords
INSERT INTO "user" (id, name, email, password_hash, role, joined_date, timezone, is_blocked) VALUES
('user-1', 'Alice Chen', 'alice@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', 'member', NOW(), 'UTC', false),
('user-2', 'Bob Smith', 'bob@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', 'member', NOW(), 'UTC', true),
('user-3', 'Admin User', 'admin@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', 'admin', NOW(), 'UTC', false);

-- Create streaks
INSERT INTO streak (user_id, current_streak_weeks, longest_streak_weeks) VALUES
('user-1', 2, 4),
('user-2', 0, 1),
('user-3', 0, 0);

-- Create stages
INSERT INTO stage (id, name, order_index, description) VALUES
('stage-1', 'Python Foundations', 1, 'Learn Python basics'),
('stage-2', 'Machine Learning', 2, 'ML algorithms'),
('stage-3', 'Deep Learning', 3, 'Neural networks');

-- Create topics
INSERT INTO topic (id, stage_id, name, order_index, resources) VALUES
('topic-1', 'stage-1', 'Variables & Data Types', 1, '{"books":["Python Crash Course"]}'),
('topic-2', 'stage-1', 'Functions & Modules', 2, '{"books":["Python Crash Course"]}'),
('topic-3', 'stage-1', 'OOP Basics', 3, '{"books":["Python Crash Course"]}');
```

**Option B: Using Node.js Script**
```bash
npm run db:seed
```

### 6. Verify Connection
1. Visit your Vercel domain
2. Try signing up
3. If it works, database is connected!

## Troubleshooting

### Connection Refused
- Check DATABASE_URL is correct
- Verify Neon project is active
- Check firewall allows Vercel IPs (Neon allows all by default)

### Schema Not Found
- Verify SQL was executed in Neon SQL Editor
- Check no errors appeared during execution
- Try running init-db.sql again

### Seed Data Not Appearing
- Verify seed script ran without errors
- Check table names match schema
- Verify data types are correct

## Neon Features

- **Automatic Backups**: Hourly backups (access in dashboard)
- **Pooling**: Connection pooling included
- **Monitoring**: Real-time query monitoring
- **Branching**: Create database branches for testing

## Next Steps

1. Initialize schema using SQL Editor
2. Seed demo data (optional)
3. Deploy to Vercel
4. Test login/signup
5. Verify all features work
