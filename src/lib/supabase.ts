import { createClient } from '@supabase/supabase-js';
import Cookies from 'js-cookie';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Configure session tracking with cookies
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Custom storage adapter using cookies
    storage: {
      getItem: (key) => Cookies.get(key) ?? null,
      setItem: (key, value) => {
        Cookies.set(key, value, {
          expires: 365, // 1 year
          sameSite: 'Lax',
          secure: window.location.protocol === 'https:'
        });
      },
      removeItem: (key) => Cookies.remove(key),
    },
    // Auto-refresh tokens before expiry
    autoRefreshToken: true,
    // Persist session across page reloads
    persistSession: true,
    // Detect session in URL for OAuth callbacks
    detectSessionInUrl: true,
    // Flow type for authentication
    flowType: 'pkce'
  }
});

export type UserRole = 'student' | 'vendor' | 'delivery' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  matric_id: string | null;
  phone: string | null;
  hostel_address: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
  credit_balance: number | null;
  is_active: boolean | null;
}

export interface Cafe {
  id: string;
  name: string;
  location: string;
  description: string | null;
  operating_hours: string | null;
  contact: string | null;
  image_url: string | null;
}

export interface MenuItem {
  id: string;
  stallid: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  prep_time: number;
  is_available: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  cafe_id: string;
  stall_id: string | null;
  order_number: string;
  status: 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  delivery_type: 'pickup' | 'delivery';
  delivery_address: string | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_method: string | null;
  payment_status: 'pending' | 'paid' | 'failed';
  promo_code: string | null;
  notes: string | null;
  estimated_delivery_time: string | null;
  created_at: string;
  completed_at: string | null;
  order_items: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  special_instructions: string | null;
  menu_items: {
    name: string;
    category: string;
  };
}

export interface Review {
  id: string;
  order_id: string;
  customer_id: string;
  cafe_id: string;
  rating: number;
  food_rating: number | null;
  service_rating: number | null;
  comment: string | null;
  vendor_response: string | null;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  valid_from: string;
  valid_until: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
}

export interface Stall {
  id: string;
  stallname: string;
  description: string | null;
  imageurl: string | null;
  cafeid: string;
  vendorid: string;
  categories: string[];
  operation_days: string[] | null;
  open_time: string | null;
  close_time: string | null;
  stall_status: string | null;
  contact: string | null;
  available_payout: number;
}