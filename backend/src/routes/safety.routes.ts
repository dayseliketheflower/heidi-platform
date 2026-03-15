import { Router, Response } from 'express';
import { prisma } from '../server';
import { AuthRequest, authenticate } from '../utils/auth';
import { createSafetyReportSchema } from '../utils/validation';

const router = Router();

router.use(authenticate);

/**
 * POST /api/safety/reports
 * Create a safety report
 */
router.post('/reports', async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = createSafetyReportSchema.parse(req.body);
    const reporterId = req.user!.userId;

    // Verify reported user exists
    const reportedUser = await prisma.user.findUnique({
      where: { id: validatedData.reportedUserId },
    });

    if (!reportedUser) {
      return res.status(404).json({ error: 'Reported user not found' });
    }

    // If booking ID provided, verify access
    if (validatedData.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: validatedData.bookingId },
        include: {
          client: { select: { userId: true } },
          provider: { select: { userId: true } },
        },
      });

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Verify reporter is part of the booking
      if (reporterId !== booking.client.userId && reporterId !== booking.provider.userId) {
        return res.status(403).json({ error: 'Can only report bookings you are part of' });
      }
    }

    // Create report
    const report = await prisma.safetyReport.create({
      data: {
        reporterId,
        reportedUserId: validatedData.reportedUserId,
        bookingId: validatedData.bookingId,
        description: validatedData.description,
        status: 'SUBMITTED',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: reporterId,
        actionType: 'SAFETY_REPORT_CREATED',
        targetType: 'SafetyReport',
        targetId: report.id,
        metadata: { reportedUserId: validatedData.reportedUserId },
      },
    });

    res.status(201).json({
      message: 'Report submitted successfully. Our Trust & Safety team will review it.',
      report: {
        id: report.id,
        status: report.status,
        createdAt: report.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create safety report error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

/**
 * GET /api/safety/reports
 * Get user's own safety reports
 */
router.get('/reports', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const reports = await prisma.safetyReport.findMany({
      where: { reporterId: userId },
      include: {
        reportedUser: {
          select: {
            id: true,
            email: true,
          },
        },
        booking: {
          select: {
            id: true,
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
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * GET /api/safety/reports/:id
 * Get specific safety report (if user is reporter or admin)
 */
router.get('/reports/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const report = await prisma.safetyReport.findFirst({
      where: {
        id,
        OR: [
          { reporterId: userId },
          ...(req.user!.role === 'ADMIN' ? [{}] : []), // Admins can see all
        ],
      },
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
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

export default router;
