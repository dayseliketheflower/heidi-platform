import { Router, Request, Response } from 'express';
import { prisma } from '../server';

const router = Router();

/**
 * GET /api/public/service-types
 * Get all active service types
 */
router.get('/service-types', async (req: Request, res: Response) => {
  try {
    const serviceTypes = await prisma.serviceType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    res.json({ serviceTypes });
  } catch (error) {
    console.error('Get service types error:', error);
    res.status(500).json({ error: 'Failed to fetch service types' });
  }
});

/**
 * GET /api/public/policies
 * Get all published policy documents
 */
router.get('/policies', async (req: Request, res: Response) => {
  try {
    const policies = await prisma.policyDocument.findMany({
      orderBy: { publishedAt: 'desc' },
    });

    res.json({ policies });
  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

/**
 * GET /api/public/policies/:slug
 * Get a specific policy document
 */
router.get('/policies/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const policy = await prisma.policyDocument.findUnique({
      where: { slug },
    });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json({ policy });
  } catch (error) {
    console.error('Get policy error:', error);
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
});

/**
 * GET /api/public/platform-config
 * Get public platform configuration (fees, etc.)
 */
router.get('/platform-config', async (req: Request, res: Response) => {
  try {
    const config = await prisma.platformConfig.findMany({
      where: {
        key: {
          in: ['platform_fee_percentage', 'platform_fee_minimum_cents'],
        },
      },
    });

    const configMap = config.reduce((acc, item) => {
      acc[item.key] = JSON.parse(item.value);
      return acc;
    }, {} as Record<string, any>);

    res.json({ config: configMap });
  } catch (error) {
    console.error('Get platform config error:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

export default router;
