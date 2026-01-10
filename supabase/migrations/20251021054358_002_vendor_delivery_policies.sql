/*
  # Vendor and Delivery Personnel Policies
  
  This migration adds additional RLS policies to enable:
  1. Vendors to view and manage orders for their cafes
  2. Delivery personnel to view assigned deliveries
  3. Cross-module access for order tracking
  
  ## Changes
  
  1. Orders Table
    - Add policy for vendors to view cafe orders
    - Add policy for delivery personnel to view orders they're delivering
  
  2. Order Items Table
    - Add policy for vendors to view order items
  
  3. Deliveries Table
    - Add policy for vendors to view deliveries for their cafe orders
*/

-- Allow vendors to view orders for their cafes
CREATE POLICY "Vendors can view cafe orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cafes 
      WHERE cafes.id = orders.cafe_id 
      AND cafes.vendor_id = auth.uid()
    )
  );

-- Allow vendors to update orders for their cafes
CREATE POLICY "Vendors can update cafe orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cafes 
      WHERE cafes.id = orders.cafe_id 
      AND cafes.vendor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cafes 
      WHERE cafes.id = orders.cafe_id 
      AND cafes.vendor_id = auth.uid()
    )
  );

-- Allow delivery personnel to view orders assigned to them
CREATE POLICY "Delivery personnel can view assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries 
      WHERE deliveries.order_id = orders.id 
      AND deliveries.rider_id = auth.uid()
    )
  );

-- Allow vendors to view order items for their cafe orders
CREATE POLICY "Vendors can view cafe order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      JOIN cafes ON cafes.id = orders.cafe_id
      WHERE orders.id = order_items.order_id 
      AND cafes.vendor_id = auth.uid()
    )
  );

-- Allow delivery personnel to view order items for assigned deliveries
CREATE POLICY "Delivery personnel can view assigned order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries 
      WHERE deliveries.order_id = order_items.order_id 
      AND deliveries.rider_id = auth.uid()
    )
  );

-- Allow vendors to view deliveries for their cafe orders
CREATE POLICY "Vendors can view cafe order deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      JOIN cafes ON cafes.id = orders.cafe_id
      WHERE orders.id = deliveries.order_id 
      AND cafes.vendor_id = auth.uid()
    )
  );

-- Allow vendors to create deliveries for their orders
CREATE POLICY "Vendors can create deliveries"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      JOIN cafes ON cafes.id = orders.cafe_id
      WHERE orders.id = deliveries.order_id 
      AND cafes.vendor_id = auth.uid()
    )
  );