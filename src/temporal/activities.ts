import { saveHotels } from '../redis/client';
import { HotelOffer, SupplierHotel } from '../types';

const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

async function fetchSupplier(
  path: string,
  city: string,
  supplierLabel: string
): Promise<SupplierHotel[]> {
  const url = `${apiBaseUrl}${path}?city=${encodeURIComponent(city)}`;
  console.log(`[activity] fetching ${supplierLabel}: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `${supplierLabel} returned status ${response.status} for city=${city}`
    );
  }

  const data = (await response.json()) as SupplierHotel[];
  console.log(`[activity] ${supplierLabel} returned ${data.length} hotels`);
  return data;
}

export async function fetchSupplierA(city: string): Promise<SupplierHotel[]> {
  return fetchSupplier('/supplierA/hotels', city, 'Supplier A');
}

export async function fetchSupplierB(city: string): Promise<SupplierHotel[]> {
  return fetchSupplier('/supplierB/hotels', city, 'Supplier B');
}

export async function saveOffersToRedis(
  city: string,
  hotels: HotelOffer[]
): Promise<void> {
  console.log(`[activity] saving ${hotels.length} offers to Redis for ${city}`);
  await saveHotels(city, hotels);
}
