import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getUserByEmail, createUser, getAllUsers, getUserById, updateUserBlockStatus, getStreakByUserId, createStreak } from './db.js';
import { hashPassword, verifyPassword, generateToken, decodeToken } from './auth.js';
import type { AuthPayload } from './auth.js';
import type { User } from '../shared/schema.js';
import apiRouters, { processOverdueSubmissions } from './routers.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// Authentication middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = decodeToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = payload;
  next();
}

// Admin middleware
function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// Auth endpoints
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);
    const newUser = await createUser({
      name,
      email,
      password_hash: passwordHash,
      role: 'member',
      joined_date: new Date(),
      current_stage_id: null,
      timezone: 'UTC',
      is_blocked: false,
    });

    // Create streak record for new user
    await createStreak(newUser.id);

    const token = generateToken(newUser);
    res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        is_blocked: newUser.is_blocked,
      },
      token,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_blocked: user.is_blocked,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_blocked: user.is_blocked,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', authMiddleware, (req: Request, res: Response) => {
  // Token-based auth doesn't require server-side logout
  res.json({ message: 'Logged out successfully' });
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/cron/overdue', async (req: Request, res: Response) => {
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token !== expectedSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    await processOverdueSubmissions();
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Overdue cron failed:', error);
    res.status(500).json({ error: 'Overdue cron failed' });
  }
});

// Mount API routers (require auth)
app.use('/api', authMiddleware, apiRouters);

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err?.message || 'Internal server error';
  res.status(500).json({ error: message });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`?? AI Fight Club server running on http://localhost:${PORT}`);
    processOverdueSubmissions().catch(error => console.error('Overdue processing failed:', error));
  });

  const overdueTimer = setInterval(() => {
    processOverdueSubmissions().catch(error => console.error('Overdue processing failed:', error));
  }, 5 * 60 * 1000);
  overdueTimer.unref();
}

export default app;
