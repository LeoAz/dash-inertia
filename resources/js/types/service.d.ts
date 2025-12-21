export type ServiceId = number;

export interface Service {
  id: ServiceId;
  shop_id: number | null;
  name: string;
  description: string | null;
  /** Decimal string with 2 precision coming from backend */
  price: string;
  quantity: number;
  created_at: string | null; // ISO string
  updated_at: string | null; // ISO string
}

export interface ServicePageProps {
  services: {
    data: Service[];
    links?: unknown;
    meta?: unknown;
  };
  shop: { id: number | string; name: string };
}
