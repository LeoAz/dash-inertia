export type ShopId = number;

export interface Shop {
  id: ShopId;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string | null; // ISO string
  updated_at: string | null; // ISO string
}

export interface ShopPageProps {
  shops: {
    data: Shop[];
    links?: unknown;
    meta?: unknown;
  };
  filters?: {
    search?: string | null;
  };
}
