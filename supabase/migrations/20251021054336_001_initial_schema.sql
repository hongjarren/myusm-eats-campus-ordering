/*
  # USM Cafeteria Online Ordering System - Initial Schema
  
  This migration creates the core database structure for the cafeteria ordering system.
  
  ## New Tables
  
  ### 1. User Management
    - `profiles` - Extended user profile information
  
  ### 2. Vendor/Cafeteria Management
    - `cafes` - Cafeteria/restaurant information
    - `menu_items` - Food items available at cafes
    - `categories` - Menu categories
  
  ### 3. Order Management
    - `orders` - Customer orders
    - `order_items` - Items in each order
  
  ### 4. Delivery Management
    - `deliveries` - Delivery assignments and tracking
  
  ### 5. Feedback & Ratings
    - `reviews` - Customer feedback
  
  ### 6. System Configuration
    - `promo_codes` - Promotional codes
  
  ## Security
    - RLS enabled on all tables
    - Policies created for role-based access control
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USER MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  matric_id text UNIQUE,
  phone text,
  hostel_address text,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'vendor', 'delivery', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- CAFETERIA/VENDOR MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS cafes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text NOT NULL,
  description text,
  operating_hours text,
  contact text,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cafes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active cafes"
  ON cafes FOR SELECT
  TO authenticated
  USING (is_active = true OR vendor_id = auth.uid());

CREATE POLICY "Vendors can manage own cafes"
  ON cafes FOR ALL
  TO authenticated
  USING (vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid());

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  description text,
  sort_order integer DEFAULT 0
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id uuid NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  image_url text,
  category text,
  prep_time integer DEFAULT 15,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (
    is_available = true OR 
    EXISTS (SELECT 1 FROM cafes WHERE cafes.id = menu_items.cafe_id AND cafes.vendor_id = auth.uid())
  );

CREATE POLICY "Vendors can manage own menu items"
  ON menu_items FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM cafes WHERE cafes.id = menu_items.cafe_id AND cafes.vendor_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM cafes WHERE cafes.id = menu_items.cafe_id AND cafes.vendor_id = auth.uid())
  );

-- ============================================================
-- ORDER MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cafe_id uuid NOT NULL REFERENCES cafes(id) ON DELETE RESTRICT,
  order_number text UNIQUE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
  delivery_type text NOT NULL CHECK (delivery_type IN ('pickup', 'delivery')),
  delivery_address text,
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  delivery_fee decimal(10,2) DEFAULT 0,
  discount decimal(10,2) DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  payment_method text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  promo_code text,
  notes text,
  estimated_delivery_time timestamptz,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update own pending orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() AND status = 'pending')
  WITH CHECK (customer_id = auth.uid());

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  price decimal(10,2) NOT NULL,
  special_instructions text
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view order items for their orders"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers can insert order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid())
  );

-- ============================================================
-- DELIVERY MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rider_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'picked_up', 'en_route', 'delivered')),
  pickup_time timestamptz,
  delivery_time timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders can view assigned deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    rider_id = auth.uid() OR
    EXISTS (SELECT 1 FROM orders WHERE orders.id = deliveries.order_id AND orders.customer_id = auth.uid())
  );

CREATE POLICY "Riders can update assigned deliveries"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (rider_id = auth.uid())
  WITH CHECK (rider_id = auth.uid());

-- ============================================================
-- REVIEWS & FEEDBACK
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cafe_id uuid NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  food_rating integer CHECK (food_rating >= 1 AND food_rating <= 5),
  service_rating integer CHECK (service_rating >= 1 AND service_rating <= 5),
  comment text,
  vendor_response text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Customers can create reviews for own orders"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Vendors can respond to cafe reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM cafes WHERE cafes.id = reviews.cafe_id AND cafes.vendor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM cafes WHERE cafes.id = reviews.cafe_id AND cafes.vendor_id = auth.uid()));

-- ============================================================
-- PROMO CODES
-- ============================================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value decimal(10,2) NOT NULL,
  min_order_amount decimal(10,2) DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  is_active boolean DEFAULT true
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promo codes"
  ON promo_codes FOR SELECT
  TO authenticated
  USING (is_active = true AND valid_from <= now() AND (valid_until IS NULL OR valid_until >= now()));

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
BEGIN
  new_number := 'ORD' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA: Categories
-- ============================================================

INSERT INTO categories (name, description, sort_order) VALUES
  ('Rice', 'Rice-based dishes', 1),
  ('Noodles', 'Noodle dishes', 2),
  ('Western', 'Western cuisine', 3),
  ('Drinks', 'Beverages', 4),
  ('Snacks', 'Light snacks and appetizers', 5)
ON CONFLICT (name) DO NOTHING;