export type UserId = number;

export type UserRole = 'Super admin' | 'admin' | 'vendeur';

export interface UserShopRef {
  id: number;
  name: string;
}

export interface AdminUser {
  id: UserId;
  name: string;
  email: string;
  roles?: string[]; // role names from backend
  shops?: UserShopRef[];
  created_at: string | null;
  updated_at: string | null;
}

export interface UsersPageProps {
  users: {
    data: AdminUser[];
    links?: unknown;
    meta?: unknown;
  };
  filters?: {
    search?: string | null;
  };
  meta: {
    roles: UserRole[];
    shops: Array<{ id: number; name: string }>;
  };
}
