import { Router, Request, Response } from 'express';
import { runCompareHotelsWorkflow } from '../temporal/client';
import { getHotelsByPrice } from '../redis/client';

const router = Router();

// GET /api/hotels?city=delhi
// GET /api/hotels?city=delhi&minPrice=5000&maxPrice=6000
router.get('/hotels', async (req: Request, res: Response) => {
  try {
    const city = String(req.query.city || '').trim();

    if (!city) {
      res.status(400).json({ error: 'city query param is required' });
      return;
    }

    const minRaw = req.query.minPrice;
    const maxRaw = req.query.maxPrice;

    const minPrice =
      minRaw !== undefined && minRaw !== ''
        ? Number(minRaw)
        : undefined;
    const maxPrice =
      maxRaw !== undefined && maxRaw !== ''
        ? Number(maxRaw)
        : undefined;

    if (minPrice !== undefined && Number.isNaN(minPrice)) {
      res.status(400).json({ error: 'minPrice must be a number' });
      return;
    }
    if (maxPrice !== undefined && Number.isNaN(maxPrice)) {
      res.status(400).json({ error: 'maxPrice must be a number' });
      return;
    }
    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      res.status(400).json({ error: 'minPrice cannot be greater than maxPrice' });
      return;
    }

    console.log(
      `[api] /api/hotels city=${city} minPrice=${minPrice} maxPrice=${maxPrice}`
    );

    // Temporal workflow: fetch A+B in parallel, dedupe, save to Redis
    await runCompareHotelsWorkflow(city);

    // Always read from Redis so price filtering happens inside Redis
    const hotels = await getHotelsByPrice(city, minPrice, maxPrice);

    console.log(`[api] returning ${hotels.length} hotels for city=${city}`);
    res.json(hotels);
  } catch (err) {
    console.error('[api] /api/hotels failed', err);
    res.status(500).json({
      error: 'Failed to fetch hotel offers',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

export default router;
