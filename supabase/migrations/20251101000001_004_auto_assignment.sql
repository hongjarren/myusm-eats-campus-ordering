/*
  # Auto Assignment of Deliveries
  
  This migration adds functions and triggers for automatically assigning deliveries
  to the nearest available rider.
*/

-- Function to auto-assign a delivery to the nearest available rider
CREATE OR REPLACE FUNCTION auto_assign_delivery()
RETURNS TRIGGER AS $$
DECLARE
  delivery_address_lat FLOAT;
  delivery_address_lon FLOAT;
  nearest_rider RECORD;
BEGIN
  -- Extract coordinates from delivery address (simplified version)
  -- In a real implementation, this would use a geocoding service
  -- For now, we'll use some default coordinates for USM main campus
  delivery_address_lat := 5.355545;
  delivery_address_lon := 100.302736;

  -- Find the nearest available rider
  SELECT * FROM find_nearest_rider(delivery_address_lat, delivery_address_lon)
  INTO nearest_rider;

  -- If a rider is found, assign the delivery
  IF nearest_rider.rider_id IS NOT NULL THEN
    UPDATE deliveries
    SET rider_id = nearest_rider.rider_id
    WHERE id = NEW.id;
    
    -- You could also send a notification to the rider here
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign deliveries when created
CREATE OR REPLACE TRIGGER auto_assign_delivery_trigger
  AFTER INSERT ON deliveries
  FOR EACH ROW
  WHEN (NEW.rider_id IS NULL)
  EXECUTE FUNCTION auto_assign_delivery();

-- Function to manually reassign a delivery to the nearest rider
CREATE OR REPLACE FUNCTION reassign_delivery(delivery_id uuid)
RETURNS boolean AS $$
DECLARE
  delivery_address_lat FLOAT;
  delivery_address_lon FLOAT;
  nearest_rider RECORD;
BEGIN
  -- Extract coordinates (simplified)
  delivery_address_lat := 5.355545;
  delivery_address_lon := 100.302736;

  -- Find the nearest available rider
  SELECT * FROM find_nearest_rider(delivery_address_lat, delivery_address_lon)
  INTO nearest_rider;

  -- If a rider is found, reassign the delivery
  IF nearest_rider.rider_id IS NOT NULL THEN
    UPDATE deliveries
    SET 
      rider_id = nearest_rider.rider_id,
      status = 'assigned'
    WHERE id = delivery_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;