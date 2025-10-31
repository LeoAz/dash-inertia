export type HairdresserId = number;

export interface Hairdresser {
  id: HairdresserId;
  shop_id: number | null;
  name: string;
  phone: string | null;
  hire_date: string | null; // ISO date (YYYY-MM-DD)
  created_at: string | null; // ISO string
  updated_at: string | null; // ISO string
}

export interface HairdresserPageProps {
  hairdressers: {
    data: Hairdresser[];
    links?: unknown;
    meta?: unknown;
  };
  shop: { id: number | string; name: string };
}
