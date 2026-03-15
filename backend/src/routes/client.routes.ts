import { Router, Response } from 'express';
import { prisma } from '../server';
import { AuthRequest, authenticate, authorize, requireActiveMembership } from '../utils/auth';
import { clientProfileSchema, providerSearchSchema } from '../utils/validation';

const router = Router();

// All routes require CLIENT role
router.use(authenticate, authorize('CLIENT'));

/**
 * POST /api/client/profile
 * Create or update client profile
 */
router.post('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = clientProfileSchema.parse(req.body);
    const userId = req.user!.userId;

    // Check if profile exists
    const existingProfile = await prisma.clientProfile.findUnique({
      where: { userId },
    });

    let profile;
    if (existingProfile) {
      // Update existing profile
      profile = await prisma.clientProfile.update({
        where: { userId },
        data: validatedData,
      });
    } else {
      // Create new profile
      profile = await prisma.clientProfile.create({
        data: {
          ...validatedData,
          userId,
        },
      });
    }

    res.json({ message: 'Profile saved successfully', profile });
  } catch (error: any) {
    console.error('Profile save error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

/**
 * GET /api/client/profile
 * Get client profile
 */
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.clientProfile.findUnique({
      where: { userId: req.user!.userId },
      include: { membership: { include: { plan: true } } },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * GET /api/client/membership/plans
 * Get available membership plans
 */
router.get('/membership/plans', async (req: AuthRequest, res: Response) => {
  try {
    const plans = await prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    res.json({ plans });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

/**
 * POST /api/client/membership/subscribe
 * Subscribe to a membership plan (payment stub)
 */
router.post('/membership/subscribe', async (req: AuthRequest, res: Response) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID required' });
    }

    const userId = req.user!.userId;

    // Get client profile
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
      include: { membership: true },
    });

    if (!clientProfile) {
      return res.status(404).json({ error: 'Client profile not found. Please complete your profile first.' });
    }

    // Get plan
    const plan = await prisma.membershipPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return res.status(404).json({ error: 'Plan not found or inactive' });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (plan.billingPeriod === 'MONTHLY') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // TODO: In production, process payment here via Stripe/payment processor
    // For now, we'll create/update membership directly

    let membership;
    if (clientProfile.membership) {
      // Update existing membership
      membership = await prisma.membership.update({
        where: { id: clientProfile.membership.id },
        data: {
          planId,
          status: 'ACTIVE',
          startDate,
          endDate,
          lastPaymentDate: startDate,
        },
        include: { plan: true },
      });
    } else {
      // Create new membership
      membership = await prisma.membership.create({
        data: {
          clientProfileId: clientProfile.id,
          planId,
          status: 'ACTIVE',
          startDate,
          endDate,
          lastPaymentDate: startDate,
        },
        include: { plan: true },
      });
    }

    res.json({
      message: 'Membership activated successfully',
      membership,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to process subscription' });
  }
});

/**
 * GET /api/client/providers/search
 * Search for providers (requires active membership)
 */
router.get('/providers/search', requireActiveMembership, async (req: AuthRequest, res: Response) => {
  try {
    const query = providerSearchSchema.parse({
      ...req.query,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    });

    const { page, limit, location, serviceType, minRate, maxRate, identityTags, languages } = query;
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: any = {
      isApproved: true,
      verificationStatus: 'VERIFIED',
      user: { status: 'ACTIVE' },
    };

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    if (serviceType) {
      where.servicesOffered = { has: serviceType };
    }

    if (minRate !== undefined || maxRate !== undefined) {
      where.baseHourlyRate = {};
      if (minRate !== undefined) where.baseHourlyRate.gte = minRate;
      if (maxRate !== undefined) where.baseHourlyRate.lte = maxRate;
    }

    if (identityTags && identityTags.length > 0) {
      where.identityTags = { hasSome: identityTags };
    }

    if (languages && languages.length > 0) {
      where.languages = { hasSome: languages };
    }

    // Execute query
    const [providers, total] = await Promise.all([
      prisma.providerProfile.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
        },
        orderBy: [
          { averageRating: 'desc' },
          { totalSessions: 'desc' },
        ],
      }),
      prisma.providerProfile.count({ where }),
    ]);

    res.json({
      providers: providers.map(p => ({
        ...p,
        // Don't expose sensitive info
        user: { id: p.user.id },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Provider search error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid search parameters', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to search providers' });
  }
});

/**
 * GET /api/client/providers/:id
 * Get provider profile details (requires active membership)
 */
router.get('/providers/:id', requireActiveMembership, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const provider = await prisma.providerProfile.findFirst({
      where: {
        id,
        isApproved: true,
        verificationStatus: 'VERIFIED',
        user: { status: 'ACTIVE' },
      },
      include: {
        user: {
          select: {
            id: true,
            createdAt: true,
          },
        },
        availability: true,
        receivedReviews: {
          where: { isVisible: true },
          include: {
            reviewer: {
              select: {
                id: true,
                clientProfile: {
                  select: {
                    firstName: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({ provider });
  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({ error: 'Failed to fetch provider' });
  }
});

/**
 * GET /api/client/bookings
 * Get client's bookings
 */
router.get('/bookings', async (req: AuthRequest, res: Response) => {
  try {
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!clientProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const bookings = await prisma.booking.findMany({
      where: { clientId: clientProfile.id },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
        serviceType: true,
        boundarySummary: true,
      },
      orderBy: { startTime: 'desc' },
    });

    res.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

export default router;
