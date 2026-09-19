import { Router, Request, Response } from 'express';
import { pingRedis } from '../redis/client';

const router = Router();

const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

async function checkSupplier(path: string): Promise<'up' | 'down'> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      `${apiBaseUrl}${path}?city=delhi`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    return response.ok ? 'up' : 'down';
  } catch {
    return 'down';
  }
}

// GET /health — reports Supplier A, Supplier B, and Redis
router.get('/health', async (_req: Request, res: Response) => {
  const [supplierA, supplierB, redisOk] = await Promise.all([
    checkSupplier('/supplierA/hotels'),
    checkSupplier('/supplierB/hotels'),
    pingRedis(),
  ]);

  const allOk =
    supplierA === 'up' && supplierB === 'up' && redisOk;

  const body = {
    status: allOk ? 'ok' : 'degraded',
    suppliers: {
      A: supplierA,
      B: supplierB,
    },
    redis: redisOk ? 'up' : 'down',
  };

  res.status(allOk ? 200 : 503).json(body);
});

export default router;
