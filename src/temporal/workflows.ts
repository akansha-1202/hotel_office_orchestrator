import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';
import type { HotelOffer, SupplierHotel } from '../types';

// Activities run in the worker process (HTTP + Redis).
// Workflow only orchestrates and does pure merge logic.
const { fetchSupplierA, fetchSupplierB, saveOffersToRedis } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: '30 seconds',
  retry: {
    maximumAttempts: 3,
  },
});

function toOffer(hotel: SupplierHotel, supplier: string): HotelOffer {
  return {
    name: hotel.name,
    price: hotel.price,
    supplier,
    commissionPct: hotel.commissionPct,
  };
}

// Put each hotel into a Map by name.
// If the name already exists, keep the cheaper one.
function mergeHotelOffers(
  listA: SupplierHotel[],
  listB: SupplierHotel[]
): HotelOffer[] {
  const bestByName = new Map<string, HotelOffer>();

  function consider(hotel: SupplierHotel, supplier: string) {
    const key = hotel.name.trim().toLowerCase();
    const offer = toOffer(hotel, supplier);
    const existing = bestByName.get(key);

    if (!existing || offer.price < existing.price) {
      bestByName.set(key, offer);
    }
  }

  for (const hotel of listA) {
    consider(hotel, 'Supplier A');
  }
  for (const hotel of listB) {
    consider(hotel, 'Supplier B');
  }

  return Array.from(bestByName.values());
}

export async function compareHotelsWorkflow(
  city: string
): Promise<HotelOffer[]> {
  // Call both suppliers at the same time
  const [listA, listB] = await Promise.all([
    fetchSupplierA(city),
    fetchSupplierB(city),
  ]);

  const bestOffers = mergeHotelOffers(listA, listB);

  // Save deduped list in Redis (sorted by price)
  await saveOffersToRedis(city, bestOffers);

  return bestOffers;
}
