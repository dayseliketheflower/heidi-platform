import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create membership plans
  const monthlyPlan = await prisma.membershipPlan.upsert({
    where: { name: 'Monthly Membership' },
    update: {},
    create: {
      name: 'Monthly Membership',
      billingPeriod: 'MONTHLY',
      price: 2999, // $29.99
      description: 'Full access to the platform with monthly billing',
      perks: {
        features: [
          'Unlimited provider searches',
          'Secure in-app messaging',
          'Booking management',
          'Safety & support resources',
        ],
      },
    },
  });

  const yearlyPlan = await prisma.membershipPlan.upsert({
    where: { name: 'Yearly Membership' },
    update: {},
    create: {
      name: 'Yearly Membership',
      billingPeriod: 'YEARLY',
      price: 29999, // $299.99 (save ~$60 vs monthly)
      description: 'Full access to the platform with yearly billing - save 17%',
      perks: {
        features: [
          'Unlimited provider searches',
          'Secure in-app messaging',
          'Booking management',
          'Safety & support resources',
          'Priority customer support',
          '17% savings vs monthly',
        ],
      },
    },
  });

  console.log('✅ Membership plans created');

  // Create service types
  const serviceTypes = [
    {
      name: 'Emotional Support Session',
      description: 'A supportive presence during difficult times, offering listening and companionship',
      defaultDurationMinutes: [60, 90, 120],
    },
    {
      name: 'Medical/Dental Appointment Companion',
      description: 'Accompany you to medical or dental appointments for emotional support',
      defaultDurationMinutes: [60, 120, 180],
    },
    {
      name: 'Public Space Meetup',
      description: 'Meet in a public space for conversation and companionship',
      defaultDurationMinutes: [60, 90, 120],
    },
    {
      name: 'At-Home Support Visit',
      description: 'Compassionate presence during grief, anxiety, or challenging moments at your home',
      defaultDurationMinutes: [90, 120, 180],
    },
    {
      name: 'Activity Companion',
      description: 'Companionship during activities like walks, errands, or events',
      defaultDurationMinutes: [60, 120, 180],
    },
  ];

  for (const service of serviceTypes) {
    await prisma.serviceType.upsert({
      where: { name: service.name },
      update: {},
      create: service,
    });
  }

  console.log('✅ Service types created');

  // Create policy documents
  const policies = [
    {
      slug: 'code-of-conduct',
      title: 'Code of Conduct',
      content: `# Code of Conduct

## Our Commitment

Heidi is a platform dedicated to providing safe, nonsexual emotional support and companionship. All users must uphold the highest standards of respect, consent, and professionalism.

## What is Allowed

- Emotional support and active listening
- Nonsexual physical presence (sitting nearby, hand-holding, hugs) **with explicit consent**
- Accompanying clients to appointments or events
- Compassionate presence during difficult times
- Professional, respectful communication

## What is Prohibited

- Sexual services or solicitation of any kind
- Harassment, threats, or abusive behavior
- Intoxicated sessions
- Violation of agreed-upon boundaries
- Sharing personal contact information outside the platform (initial sessions)
- Discrimination based on identity, orientation, or background

## Consequences

Violations may result in:
- Warning
- Temporary suspension
- Permanent ban
- Legal action in severe cases

## Reporting

If you experience or witness violations, please report immediately using our in-app reporting tools.`,
      version: '1.0',
    },
    {
      slug: 'nonsexual-policy',
      title: 'Nonsexual Services Policy',
      content: `# Nonsexual Services Policy

## Clear Boundaries

Heidi is **not** a dating, escort, or sexual services platform. All sessions must be:

- Explicitly nonsexual in nature and intention
- Focused on emotional support and companionship
- Within clearly communicated and mutually agreed boundaries

## Physical Contact

Any physical contact must be:
- **Consensually agreed upon** before the session
- Nonsexual and appropriate (e.g., hand-holding, side hug, sitting nearby)
- Documented in the boundary summary
- Immediately stopped if anyone feels uncomfortable

## Violations

Sexual advances, requests, or behavior will result in immediate account termination and may be reported to authorities.

## Client & Provider Responsibilities

Both parties must:
- Respect the nonsexual nature of all interactions
- Communicate boundaries clearly
- Report any violations immediately`,
      version: '1.0',
    },
    {
      slug: 'safety-guidelines',
      title: 'Safety Guidelines',
      content: `# Safety Guidelines

## Before Your Session

1. **Review provider/client profile** thoroughly
2. **Complete boundary summary** with explicit expectations
3. **First meetings** should be in public spaces during daytime
4. **Optional pre-session video call** to assess compatibility
5. **Share session details** with a trusted person

## During Your Session

1. **Trust your instincts** - if something feels wrong, it probably is
2. **Boundaries can change** - you can always modify comfort levels
3. **Use panic/report button** if you feel unsafe
4. **Stay sober** - both parties should be clear-headed

## After Your Session

1. **Leave a review** to help the community
2. **Report concerns** immediately
3. **Seek support** if you experienced any issues

## Platform Safety Features

- Identity verification required
- Background checks for providers
- In-app messaging monitoring
- Panic button and reporting tools
- Trust & Safety team review

## Emergency

In case of immediate danger, call local emergency services (911 in the US). Then report the incident to our Trust & Safety team.`,
      version: '1.0',
    },
  ];

  for (const policy of policies) {
    await prisma.policyDocument.upsert({
      where: { slug: policy.slug },
      update: {},
      create: policy,
    });
  }

  console.log('✅ Policy documents created');

  // Create platform configuration
  await prisma.platformConfig.upsert({
    where: { key: 'platform_fee_percentage' },
    update: {},
    create: {
      key: 'platform_fee_percentage',
      value: '20',
      description: 'Platform fee as percentage of booking price',
    },
  });

  await prisma.platformConfig.upsert({
    where: { key: 'platform_fee_minimum_cents' },
    update: {},
    create: {
      key: 'platform_fee_minimum_cents',
      value: '500',
      description: 'Minimum platform fee in cents ($5.00)',
    },
  });

  console.log('✅ Platform configuration created');

  // Create demo admin user (development only)
  if (process.env.NODE_ENV === 'development') {
    const adminEmail = 'admin@heidi.com';
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: await hashPassword('admin123'),
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
      console.log('✅ Demo admin user created (admin@heidi.com / admin123)');
    }
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
