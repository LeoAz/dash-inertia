export type PromotionId = number;

export interface Promotion {
  id: PromotionId;
  shop_id: number | null;
  name: string;
  percentage: string; // serialized as string from API
  amount: string; // serialized as string from API
  days_of_week: number[] | null;
  active: boolean;
  applicable_to_products: boolean;
  applicable_to_services: boolean;
  starts_at?: string | null; // YYYY-MM-DD
  ends_at?: string | null; // YYYY-MM-DD
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PromotionPageProps {
  promotions: {
    data: Promotion[];
    links?: unknown;
    meta?: unknown;
  };
  shop: { id: number | string; name: string };
}
