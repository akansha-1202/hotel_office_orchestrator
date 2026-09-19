import { SupplierHotel } from '../types';

// Hardcoded hotels for Supplier A.
// Holtin and Radison overlap with Supplier B so we can compare prices.
export const supplierAHotels: SupplierHotel[] = [
  {
    hotelId: 'a1',
    name: 'Holtin',
    price: 6000,
    city: 'delhi',
    commissionPct: 10,
  },
  {
    hotelId: 'a2',
    name: 'Radison',
    price: 5900,
    city: 'delhi',
    commissionPct: 13,
  },
  {
    hotelId: 'a3',
    name: 'Taj Palace',
    price: 8500,
    city: 'delhi',
    commissionPct: 12,
  },
  {
    hotelId: 'a4',
    name: 'Sea View Inn',
    price: 4200,
    city: 'mumbai',
    commissionPct: 11,
  },
];

// Hardcoded hotels for Supplier B.
// Holtin is cheaper here; Radison is more expensive than A.
export const supplierBHotels: SupplierHotel[] = [
  {
    hotelId: 'b1',
    name: 'Holtin',
    price: 5340,
    city: 'delhi',
    commissionPct: 20,
  },
  {
    hotelId: 'b2',
    name: 'Radison',
    price: 6200,
    city: 'delhi',
    commissionPct: 15,
  },
  {
    hotelId: 'b3',
    name: 'Lemon Tree',
    price: 4800,
    city: 'delhi',
    commissionPct: 18,
  },
  {
    hotelId: 'b4',
    name: 'Marine Bay',
    price: 5100,
    city: 'mumbai',
    commissionPct: 14,
  },
];

export function getHotelsByCity(
  hotels: SupplierHotel[],
  city: string
): SupplierHotel[] {
  const cityLower = city.trim().toLowerCase();
  return hotels.filter((h) => h.city.toLowerCase() === cityLower);
}
