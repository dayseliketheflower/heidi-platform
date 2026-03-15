import { z } from 'zod';

// Auth Schemas
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['CLIENT', 'PROVIDER']),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Client Profile Schemas
export const clientProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  preferences: z.record(z.any()).optional(),
});

// Provider Profile Schemas
export const providerProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  location: z.string().min(1, 'Location is required'),
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(1000),
  servicesOffered: z.array(z.string()).min(1, 'At least one service required'),
  baseHourlyRate: z.number().min(2000, 'Hourly rate must be at least $20.00').max(50000),
  maxTravelDistance: z.number().optional(),
  languages: z.array(z.string()).min(1, 'At least one language required'),
  identityTags: z.array(z.string()).min(1, 'At least one identity tag required'),
});

export const providerAvailabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
});

// Booking Schemas
export const createBookingSchema = z.object({
  providerId: z.string().cuid(),
  serviceTypeId: z.string().cuid(),
  startTime: z.string().datetime(),
  durationMinutes: z.number().min(30).max(480), // 30 min to 8 hours
  locationType: z.enum(['PUBLIC_SPACE', 'PROVIDER_LOCATION', 'CLIENT_LOCATION', 'VIRTUAL']),
  locationDetails: z.string().optional(),
  requestMessage: z.string().max(500).optional(),
});

export const boundarySummarySchema = z.object({
  allowedPhysicalContact: z.enum(['NONE', 'HAND_HOLDING', 'SIDE_HUG', 'FULL_HUG', 'CUDDLING']),
  topicsToAvoid: z.array(z.string()),
  preferredTone: z.string().optional(),
  clientNeeds: z.string().max(500).optional(),
  additionalNotes: z.string().max(500).optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_PROVIDER']),
  rejectionReason: z.string().optional(),
});

// Message Schema
export const sendMessageSchema = z.object({
  bookingId: z.string().cuid(),
  content: z.string().min(1).max(1000),
});

// Review Schema
export const createReviewSchema = z.object({
  bookingId: z.string().cuid(),
  rating: z.number().min(1).max(5),
  text: z.string().max(500).optional(),
});

// Safety Report Schema
export const createSafetyReportSchema = z.object({
  reportedUserId: z.string().cuid(),
  bookingId: z.string().cuid().optional(),
  description: z.string().min(10, 'Please provide details about the issue').max(2000),
});

export const updateSafetyReportSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
  resolutionNotes: z.string().optional(),
});

// Admin Schemas
export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
  reason: z.string().optional(),
});

export const createMembershipPlanSchema = z.object({
  name: z.string().min(1),
  billingPeriod: z.enum(['MONTHLY', 'YEARLY']),
  price: z.number().min(0),
  description: z.string(),
  perks: z.record(z.any()).optional(),
});

export const updatePlatformConfigSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  description: z.string().optional(),
});

// Search/Filter Schemas
export const providerSearchSchema = z.object({
  location: z.string().optional(),
  serviceType: z.string().optional(),
  minRate: z.number().optional(),
  maxRate: z.number().optional(),
  identityTags: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  availableDate: z.string().datetime().optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
});
