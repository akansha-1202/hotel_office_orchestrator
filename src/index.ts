import 'dotenv/config';
import express from 'express';
import supplierRoutes from './routes/suppliers';
import hotelRoutes from './routes/hotels';
import healthRoutes from './routes/health';

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());

// Mock suppliers live on the same service
app.use(supplierRoutes);

// Main API
app.use('/api', hotelRoutes);

// Health check
app.use(healthRoutes);

app.get('/', (_req, res) => {
  res.json({
    name: 'Hotel Offer Orchestrator',
    endpoints: [
      'GET /api/hotels?city=delhi',
      'GET /api/hotels?city=delhi&minPrice=5000&maxPrice=6000',
      'GET /supplierA/hotels?city=delhi',
      'GET /supplierB/hotels?city=delhi',
      'GET /health',
    ],
  });
});

app.listen(port, () => {
  console.log(`[api] Hotel Offer Orchestrator listening on port ${port}`);
});
