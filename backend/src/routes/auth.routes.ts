import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { hashPassword, comparePassword, generateToken, AuthRequest, authenticate } from '../utils/auth';
import { signupSchema, loginSchema } from '../utils/validation';

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new user (client or provider)
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = signupSchema.parse(req.body);
    const { email, password, role } = validatedData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        status: 'PENDING_VERIFICATION',
      },
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * POST /api/auth/login
 * Login existing user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Find user
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: {
        clientProfile: {
          include: { membership: true }
        },
        providerProfile: true,
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is banned
    if (user.status === 'BANNED') {
      return res.status(403).json({ error: 'Account has been banned' });
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        profile: user.role === 'CLIENT' ? user.clientProfile : user.providerProfile,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        clientProfile: {
          include: { membership: true }
        },
        providerProfile: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        clientProfile: true,
        providerProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token (placeholder - in production, use refresh tokens)
 */
router.post('/refresh', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const newToken = generateToken({
      userId: req.user!.userId,
      email: req.user!.email,
      role: req.user!.role,
    });

    res.json({ token: newToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

export default router;
