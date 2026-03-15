import { Router, Response } from 'express';
import { prisma } from '../server';
import { AuthRequest, authenticate, requireActiveMembership } from '../utils/auth';
import { createBookingSchema, boundarySummarySchema, sendMessageSchema, createReviewSchema } from '../utils/validation';
import { calculateBookingPrice } from '../utils/pricing';

const router = Router();

router.use(authenticate);

/**
 * POST /api/bookings
 * Create a new booking request (clients only, requires active membership)
 */
router.post('/', requireActiveMembership, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = createBookingSchema.parse(req.body);
    const userId = req.user!.userId;

    // Get client profile
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
    });

    if (!clientProfile) {
      return res.status(404).json({ error: 'Client profile not found' });
    }

    // Get provider profile
    const provider = await prisma.providerProfile.findFirst({
      where: {
        id: validatedData.providerId,
        isApproved: true,
        verificationStatus: 'VERIFIED',
      },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found or not available' });
    }

    // Calculate pricing
    const pricing = calculateBookingPrice(provider.baseHourlyRate, validatedData.durationMinutes);

    // Validate service type
    const serviceType = await prisma.serviceType.findFirst({
      where: { id: validatedData.serviceTypeId, isActive: true },
    });

    if (!serviceType) {
      return res.status(404).json({ error: 'Service type not found' });
    }

    // Parse start time
    const startTime = new Date(validatedData.startTime);
    const endTime = new Date(startTime.getTime() + validatedData.durationMinutes * 60000);

    // Check for scheduling conflicts
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        providerId: provider.id,
        status: { in: ['REQUESTED', 'ACCEPTED'] },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingBooking) {
      return res.status(409).json({ error: 'Provider is not available at this time' });
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        clientId: clientProfile.id,
        providerId: provider.id,
        serviceTypeId: validatedData.serviceTypeId,
        startTime,
        endTime,
        durationMinutes: validatedData.durationMinutes,
        locationType: validatedData.locationType,
        locationDetails: validatedData.locationDetails,
        priceTotal: pricing.priceTotal,
        platformFee: pricing.platformFee,
        providerPayout: pricing.providerPayout,
        requestMessage: validatedData.requestMessage,
        status: 'REQUESTED',
      },
      include: {
        provider: {
          select: {
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
        serviceType: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        actionType: 'BOOKING_CREATED',
        targetType: 'Booking',
        targetId: booking.id,
      },
    });

    res.status(201).json({
      message: 'Booking request created successfully',
      booking,
      pricing,
    });
  } catch (error: any) {
    console.error('Create booking error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

/**
 * GET /api/bookings/:id
 * Get booking details
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Get user's profile to determine access
    const [clientProfile, providerProfile] = await Promise.all([
      prisma.clientProfile.findUnique({ where: { userId } }),
      prisma.providerProfile.findUnique({ where: { userId } }),
    ]);

    // Build access filter
    const where: any = { id };
    if (clientProfile) {
      where.clientId = clientProfile.id;
    } else if (providerProfile) {
      where.providerId = providerProfile.id;
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    const booking = await prisma.booking.findFirst({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
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
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

/**
 * POST /api/bookings/:id/boundary-summary
 * Create or update boundary summary for a booking
 */
router.post('/:id/boundary-summary', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = boundarySummarySchema.parse(req.body);
    const userId = req.user!.userId;

    // Verify booking access (client only)
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
    });

    if (!clientProfile) {
      return res.status(403).json({ error: 'Only clients can set boundary summaries' });
    }

    const booking = await prisma.booking.findFirst({
      where: { id, clientId: clientProfile.id },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Upsert boundary summary
    const boundarySummary = await prisma.boundarySummary.upsert({
      where: { bookingId: id },
      update: validatedData,
      create: {
        ...validatedData,
        bookingId: id,
      },
    });

    res.json({ message: 'Boundary summary saved', boundarySummary });
  } catch (error: any) {
    console.error('Boundary summary error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to save boundary summary' });
  }
});

/**
 * POST /api/bookings/messages
 * Send a message related to a booking
 */
router.post('/messages', async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = sendMessageSchema.parse(req.body);
    const senderId = req.user!.userId;

    // Get booking and verify access
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

    // Verify sender is part of the booking
    if (senderId !== booking.client.userId && senderId !== booking.provider.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Determine receiver
    const receiverId = senderId === booking.client.userId 
      ? booking.provider.userId 
      : booking.client.userId;

    // Create message
    const message = await prisma.message.create({
      data: {
        bookingId: validatedData.bookingId,
        senderId,
        receiverId,
        content: validatedData.content,
      },
    });

    res.status(201).json({ message });
  } catch (error: any) {
    console.error('Send message error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * GET /api/bookings/:id/messages
 * Get messages for a booking
 */
router.get('/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Verify access
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: { select: { userId: true } },
        provider: { select: { userId: true } },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (userId !== booking.client.userId && userId !== booking.provider.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    // Mark as read
    await prisma.message.updateMany({
      where: {
        bookingId: id,
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/bookings/:id/review
 * Create a review for a completed booking
 */
router.post('/:id/review', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = createReviewSchema.parse({ ...req.body, bookingId: id });
    const userId = req.user!.userId;

    // Get booking
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: { select: { userId: true } },
        provider: { select: { userId: true } },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify booking is completed
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Can only review completed bookings' });
    }

    // Verify user is part of booking
    if (userId !== booking.client.userId && userId !== booking.provider.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already reviewed
    const existingReview = await prisma.review.findFirst({
      where: {
        bookingId: id,
        reviewerId: userId,
      },
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this booking' });
    }

    // Determine reviewee
    const revieweeId = userId === booking.client.userId 
      ? booking.provider.userId 
      : booking.client.userId;

    // Create review
    const review = await prisma.review.create({
      data: {
        bookingId: id,
        reviewerId: userId,
        revieweeId,
        rating: validatedData.rating,
        text: validatedData.text,
      },
    });

    // Update provider average rating if reviewing a provider
    if (userId === booking.client.userId) {
      const providerProfile = await prisma.providerProfile.findUnique({
        where: { userId: booking.provider.userId },
        include: {
          user: {
            include: {
              receivedReviews: {
                where: { isVisible: true },
              },
            },
          },
        },
      });

      if (providerProfile) {
        const allRatings = providerProfile.user.receivedReviews.map(r => r.rating);
        const avgRating = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;

        await prisma.providerProfile.update({
          where: { id: providerProfile.id },
          data: {
            averageRating: avgRating,
            totalReviews: allRatings.length,
          },
        });
      }
    }

    res.status(201).json({ message: 'Review submitted', review });
  } catch (error: any) {
    console.error('Create review error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

export default router;
