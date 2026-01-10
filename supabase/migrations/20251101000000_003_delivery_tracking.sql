/*
  # Delivery Tracking Enhancement
  
  This migration adds additional fields to support delivery tracking and location updates.
  
  ## Changes
  
  1. Deliveries Table
    - Add current_location field for storing rider's location
    - Add status_history for tracking status changes
    - Add last_location_update for tracking when location was last updated
*/

-- Add postgis extension for location data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add new columns to deliveries table
ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS current_location geography(POINT),
ADD COLUMN IF NOT EXISTS last_location_update timestamptz,
ADD COLUMN IF NOT EXISTS status_history jsonb[] DEFAULT ARRAY[]::jsonb[];

-- Create function to update status history
CREATE OR REPLACE FUNCTION update_delivery_status_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS NULL OR OLD.status != NEW.status THEN
    NEW.status_history = array_append(
      COALESCE(OLD.status_history, ARRAY[]::jsonb[]),
      jsonb_build_object(
        'status', NEW.status,
        'timestamp', NOW(),
        'previous_status', OLD.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status history
CREATE TRIGGER delivery_status_history_trigger
  BEFORE UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_status_history();

-- Create function to update location and timestamp
CREATE OR REPLACE FUNCTION update_delivery_location(
  delivery_id uuid,
  latitude float,
  longitude float
)
RETURNS void AS $$
BEGIN
  UPDATE deliveries
  SET 
    current_location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
    last_location_update = NOW()
  WHERE id = delivery_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 float,
  lon1 float,
  lat2 float,
  lon2 float
)
RETURNS float AS $$
BEGIN
  RETURN ST_Distance(
    ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
  );
END;
$$ LANGUAGE plpgsql;

-- Function to find nearest available rider
CREATE OR REPLACE FUNCTION find_nearest_rider(
  order_lat float,
  order_lon float
)
RETURNS TABLE (
  rider_id uuid,
  distance float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.rider_id,
    calculate_distance(
      ST_Y(ST_AsText(d.current_location::geometry)::point),
      ST_X(ST_AsText(d.current_location::geometry)::point),
      order_lat,
      order_lon
    ) as distance
  FROM deliveries d
  JOIN profiles p ON p.id = d.rider_id
  WHERE 
    p.role = 'delivery'
    AND d.status = 'delivered'
    AND d.last_location_update > NOW() - INTERVAL '30 minutes'
  ORDER BY distance ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;