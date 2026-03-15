import { Router, Response } from 'express';
import { prisma } from '../server';
import { AuthRequest, authenticate, authorize } from '../utils/auth';
import { providerProfileSchema, providerAvailabilitySchema, updateBookingStatusSchema } from '../utils/validation';

const router = Router();

// All routes require PROVIDER role
router.use(authenticate, authorize('PROVIDER'));

/**
 * POST /api/provider/profile
 * Create or update provider profile (application)
 */
router.post('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = providerProfileSchema.parse(req.body);
    const userId = req.user!.userId;

    // Check if profile exists
    const existingProfile = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    let profile;
    if (existingProfile) {
      // Update existing profile
      profile = await prisma.providerProfile.update({
        where: { userId },
        data: {
          ...validatedData,
          // Don't allow self-approval
          isApproved: existingProfile.isApproved,
          approvedAt: existingProfile.approvedAt,
        },
      });
    } else {
      // Create new profile (pending approval)
      profile = await prisma.providerProfile.create({
        data: {
          ...validatedData,
          userId,
          isApproved: false,
          verificationStatus: 'PENDING',
          backgroundCheckStatus: 'PENDING',
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          actorId: userId,
          actionType: 'PROVIDER_APPLICATION_SUBMITTED',
          targetType: 'ProviderProfile',
          targetId: profile.id,
        },
      });
    }

    res.json({ 
      message: existingProfile ? 'Profile updated successfully' : 'Application submitted successfully',
      profile,
    });
  } catch (error: any) {
    console.error('Provider profile error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

/**
 * GET /api/provider/profile
 * Get provider profile
 */
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: req.user!.userId },
      include: {
        availability: true,
      },
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
 * POST /api/provider/availability
 * Add availability slot
 */
router.post('/availability', async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = providerAvailabilitySchema.parse(req.body);

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const availability = await prisma.providerAvailability.create({
      data: {
        ...validatedData,
        providerId: profile.id,
      },
    });

    res.status(201).json({ message: 'Availability added', availability });
  } catch (error: any) {
    console.error('Add availability error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to add availability' });
  }
});

/**
 * DELETE /api/provider/availability/:id
 * Remove availability slot
 */
router.delete('/availability/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Verify ownership
    const availability = await prisma.providerAvailability.findFirst({
      where: { id, providerId: profile.id },
    });

    if (!availability) {
      return res.status(404).json({ error: 'Availability slot not found' });
    }

    await prisma.providerAvailability.delete({ where: { id } });

    res.json({ message: 'Availability removed' });
  } catch (error) {
    console.error('Delete availability error:', error);
    res.status(500).json({ error: 'Failed to remove availability' });
  }
});

/**
 * GET /api/provider/bookings
 * Get provider's bookings
 */
router.get('/bookings', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const { status } = req.query;
    const where: any = { providerId: profile.id };
    if (status) {
      where.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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

/**
 * PATCH /api/provider/bookings/:id/status
 * Update booking status (accept/reject)
 */
router.patch('/bookings/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateBookingStatusSchema.parse(req.body);

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get booking
    const booking = await prisma.booking.findFirst({
      where: { id, providerId: profile.id },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Validate status transition
    if (booking.status !== 'REQUESTED' && !['COMPLETED', 'CANCELLED_BY_PROVIDER'].includes(validatedData.status)) {
      return res.status(400).json({ error: 'Invalid status transition' });
    }

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: validatedData.status,
        rejectionReason: validatedData.rejectionReason,
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        serviceType: true,
      },
    });

    // If completed, update provider stats
    if (validatedData.status === 'COMPLETED') {
      await prisma.providerProfile.update({
        where: { id: profile.id },
        data: {
          totalSessions: { increment: 1 },
          totalEarnings: { increment: booking.providerPayout },
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.userId,
        actionType: `BOOKING_${validatedData.status}`,
        targetType: 'Booking',
        targetId: id,
        metadata: { previousStatus: booking.status },
      },
    });

    res.json({ message: 'Booking status updated', booking: updatedBooking });
  } catch (error: any) {
    console.error('Update booking status error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

/**
 * GET /api/provider/earnings
 * Get earnings summary
 */
router.get('/earnings', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: req.user!.userId },
      select: {
        totalEarnings: true,
        totalSessions: true,
        averageRating: true,
        totalReviews: true,
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get completed bookings breakdown
    const completedBookings = await prisma.booking.findMany({
      where: {
        provider: { userId: req.user!.userId },
        status: 'COMPLETED',
      },
      select: {
        providerPayout: true,
        platformFee: true,
        priceTotal: true,
        startTime: true,
      },
      orderBy: { startTime: 'desc' },
      take: 50,
    });

    res.json({
      summary: profile,
      recentBookings: completedBookings,
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

export default router;
