// Hotel as returned by mock suppliers (includes hotelId + city)
export type SupplierHotel = {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
};

// Final shape we send back to the client
export type HotelOffer = {
  name: string;
  price: number;
  supplier: string;
  commissionPct: number;
};
