import { Router, Response } from 'express';
import { prisma } from '../server';
import { AuthRequest, authenticate, authorize } from '../utils/auth';
import { 
  updateSafetyReportSchema, 
  updateUserStatusSchema, 
  createMembershipPlanSchema,
  updatePlatformConfigSchema 
} from '../utils/validation';

const router = Router();

// All routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

/**
 * GET /api/admin/providers/pending
 * Get providers pending approval
 */
router.get('/providers/pending', async (req: AuthRequest, res: Response) => {
  try {
    const providers = await prisma.providerProfile.findMany({
      where: { isApproved: false },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ providers });
  } catch (error) {
    console.error('Get pending providers error:', error);
    res.status(500).json({ error: 'Failed to fetch pending providers' });
  }
});

/**
 * PATCH /api/admin/providers/:id/approve
 * Approve a provider
 */
router.patch('/providers/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const provider = await prisma.providerProfile.findUnique({
      where: { id },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    if (provider.isApproved) {
      return res.status(400).json({ error: 'Provider already approved' });
    }

    const updatedProvider = await prisma.providerProfile.update({
      where: { id },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        verificationStatus: 'VERIFIED',
        backgroundCheckStatus: 'VERIFIED',
      },
    });

    // Update user status
    await prisma.user.update({
      where: { id: provider.userId },
      data: { status: 'ACTIVE' },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.userId,
        actionType: 'PROVIDER_APPROVED',
        targetType: 'ProviderProfile',
        targetId: id,
      },
    });

    res.json({ message: 'Provider approved', provider: updatedProvider });
  } catch (error) {
    console.error('Approve provider error:', error);
    res.status(500).json({ error: 'Failed to approve provider' });
  }
});

/**
 * PATCH /api/admin/providers/:id/reject
 * Reject a provider application
 */
router.patch('/providers/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const provider = await prisma.providerProfile.findUnique({
      where: { id },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const updatedProvider = await prisma.providerProfile.update({
      where: { id },
      data: {
        isApproved: false,
        verificationStatus: 'REJECTED',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.userId,
        actionType: 'PROVIDER_REJECTED',
        targetType: 'ProviderProfile',
        targetId: id,
        metadata: { reason },
      },
    });

    res.json({ message: 'Provider rejected', provider: updatedProvider });
  } catch (error) {
    console.error('Reject provider error:', error);
    res.status(500).json({ error: 'Failed to reject provider' });
  }
});

/**
 * GET /api/admin/users
 * Get all users with filtering
 */
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { role, status, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          clientProfile: true,
          providerProfile: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Update user status (suspend/ban/restore)
 */
router.patch('/users/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateUserStatusSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: validatedData.status },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.userId,
        actionType: `USER_${validatedData.status}`,
        targetType: 'User',
        targetId: id,
        metadata: { 
          previousStatus: user.status,
          reason: validatedData.reason,
        },
      },
    });

    res.json({ message: `User ${validatedData.status.toLowerCase()}`, user: updatedUser });
  } catch (error: any) {
    console.error('Update user status error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

/**
 * GET /api/admin/safety/reports
 * Get all safety reports
 */
router.get('/safety/reports', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const reports = await prisma.safetyReport.findMany({
      where,
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
          },
        },
        booking: {
          select: {
            id: true,
            startTime: true,
            serviceType: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ reports });
  } catch (error) {
    console.error('Get safety reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * PATCH /api/admin/safety/reports/:id
 * Update safety report status and resolution
 */
router.patch('/safety/reports/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateSafetyReportSchema.parse(req.body);

    const report = await prisma.safetyReport.findUnique({ where: { id } });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const updatedReport = await prisma.safetyReport.update({
      where: { id },
      data: {
        status: validatedData.status,
        resolutionNotes: validatedData.resolutionNotes,
        resolvedAt: validatedData.status === 'RESOLVED' ? new Date() : undefined,
        reviewedBy: req.user!.userId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.userId,
        actionType: `SAFETY_REPORT_${validatedData.status}`,
        targetType: 'SafetyReport',
        targetId: id,
        metadata: { previousStatus: report.status },
      },
    });

    res.json({ message: 'Report updated', report: updatedReport });
  } catch (error: any) {
    console.error('Update safety report error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update report' });
  }
});

/**
 * GET /api/admin/membership-plans
 * Get all membership plans
 */
router.get('/membership-plans', async (req: AuthRequest, res: Response) => {
  try {
    const plans = await prisma.membershipPlan.findMany({
      orderBy: { price: 'asc' },
    });

    res.json({ plans });
  } catch (error) {
    console.error('Get membership plans error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

/**
 * POST /api/admin/membership-plans
 * Create a new membership plan
 */
router.post('/membership-plans', async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = createMembershipPlanSchema.parse(req.body);

    const plan = await prisma.membershipPlan.create({
      data: validatedData,
    });

    res.status(201).json({ message: 'Plan created', plan });
  } catch (error: any) {
    console.error('Create membership plan error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

/**
 * GET /api/admin/stats
 * Get platform statistics
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      totalClients,
      totalProviders,
      activeProviders,
      totalBookings,
      completedBookings,
      activeMemberships,
      pendingReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.user.count({ where: { role: 'PROVIDER' } }),
      prisma.providerProfile.count({ where: { isApproved: true } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'COMPLETED' } }),
      prisma.membership.count({ where: { status: 'ACTIVE' } }),
      prisma.safetyReport.count({ where: { status: 'SUBMITTED' } }),
    ]);

    // Calculate total revenue
    const completedBookingsData = await prisma.booking.findMany({
      where: { status: 'COMPLETED' },
      select: { platformFee: true },
    });

    const totalRevenue = completedBookingsData.reduce((sum, b) => sum + b.platformFee, 0);

    res.json({
      stats: {
        users: {
          total: totalUsers,
          clients: totalClients,
          providers: totalProviders,
          activeProviders,
        },
        bookings: {
          total: totalBookings,
          completed: completedBookings,
        },
        memberships: {
          active: activeMemberships,
        },
        safety: {
          pendingReports,
        },
        revenue: {
          totalPlatformFees: totalRevenue,
        },
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
