import { Router, Request, Response } from 'express';
import {
  getHotelsByCity,
  supplierAHotels,
  supplierBHotels,
} from '../data/suppliers';

const router = Router();

// GET /supplierA/hotels?city=delhi
router.get('/supplierA/hotels', (req: Request, res: Response) => {
  const city = String(req.query.city || '').trim();

  if (!city) {
    res.status(400).json({ error: 'city query param is required' });
    return;
  }

  const hotels = getHotelsByCity(supplierAHotels, city);
  console.log(`[supplierA] city=${city} count=${hotels.length}`);
  res.json(hotels);
});

// GET /supplierB/hotels?city=delhi
router.get('/supplierB/hotels', (req: Request, res: Response) => {
  const city = String(req.query.city || '').trim();

  if (!city) {
    res.status(400).json({ error: 'city query param is required' });
    return;
  }

  const hotels = getHotelsByCity(supplierBHotels, city);
  console.log(`[supplierB] city=${city} count=${hotels.length}`);
  res.json(hotels);
});

export default router;
