// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'buyer' | 'store_owner' | 'driver' | 'admin';

export interface User {
  id: string; // UUID
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  push_token: string | null;
  created_at: string; // ISO 8601
  updated_at: string;
  deleted_at: string | null;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat?: number;
  lng?: number;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export type StoreType = 'retail' | 'individual';

export interface Store {
  id: string;
  owner_id: string;
  type: StoreType;
  name: string;
  description: string | null;
  logo_url: string | null;
  address: Address;
  lat: number;
  lng: number;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  stripe_account_id: string | null;
  algolia_object_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StoreWithDistance extends Store {
  distance_meters: number;
}

// ─── Product ─────────────────────────────────────────────────────────────────

export type ProductCondition = 'new' | 'used' | 'excess';

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string;
  unit: string; // e.g. "each", "box", "sqft"
  price_cents: number; // always in cents
  stock: number;
  image_urls: string[];
  weight_kg: number | null;
  condition: ProductCondition;
  is_active: boolean;
  algolia_object_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── Order ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending_payment'
  | 'payment_confirmed'
  | 'store_accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface Order {
  id: string;
  buyer_id: string;
  store_id: string;
  status: OrderStatus;
  delivery_address: Address;
  delivery_notes: string | null;
  subtotal_cents: number;
  delivery_fee_cents: number;
  platform_fee_cents: number; // 15%
  total_cents: number;
  stripe_payment_intent_id: string | null;
  stripe_payment_status: string | null;
  estimated_delivery_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_cents: number; // snapshot at time of order
  total_cents: number;
  created_at: string;
}

// ─── Driver ──────────────────────────────────────────────────────────────────

export type VehicleType = 'bicycle' | 'motorcycle' | 'car' | 'van' | 'truck';
export type DriverStatus = 'offline' | 'online' | 'on_delivery';

export interface Driver {
  id: string;
  user_id: string;
  vehicle_type: VehicleType;
  vehicle_plate: string | null;
  license_number: string | null;
  is_verified: boolean;
  status: DriverStatus;
  current_lat: number | null;
  current_lng: number | null;
  stripe_account_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── Delivery ────────────────────────────────────────────────────────────────

export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'en_route_to_store'
  | 'at_store'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed';

export interface Delivery {
  id: string;
  order_id: string;
  driver_id: string | null;
  status: DeliveryStatus;
  pickup_address: Address;
  dropoff_address: Address;
  distance_km: number | null;
  driver_fee_cents: number; // 20% of order
  proof_photo_url: string | null;
  pickup_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Review ──────────────────────────────────────────────────────────────────

export type ReviewTargetType = 'store' | 'driver';

export interface Review {
  id: string;
  order_id: string;
  reviewer_id: string; // buyer
  target_type: ReviewTargetType;
  target_id: string; // store_id or driver_id
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  created_at: string;
}

// ─── Payout ──────────────────────────────────────────────────────────────────

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed';
export type PayoutRecipientType = 'store' | 'driver';

export interface Payout {
  id: string;
  recipient_type: PayoutRecipientType;
  recipient_id: string; // store_id or driver_id
  order_id: string;
  amount_cents: number;
  stripe_transfer_id: string | null;
  status: PayoutStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── API Response Shapes ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ─── WebSocket Events ────────────────────────────────────────────────────────

export interface WsOrderStatusUpdate {
  order_id: string;
  status: OrderStatus;
  updated_at: string;
}

export interface WsDriverLocationUpdate {
  delivery_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface WsNewOrder {
  order: Order;
}

export interface WsNewDelivery {
  delivery: Delivery;
  order: Pick<Order, 'id' | 'store_id' | 'delivery_address' | 'total_cents'>;
}
