/*
  # Fix Delivery Trigger ON CONFLICT Issue
  
  The trigger sync_deliveries_on_order_update is failing because it uses ON CONFLICT
  but there's no unique constraint on order_id in the deliveries table.
  
  This migration:
  1. Adds a unique constraint on order_id (one delivery per order)
  2. Fixes or recreates the sync_deliveries_on_order_update trigger function
*/

-- Add unique constraint on order_id (one delivery per order)
-- First, check if there are any duplicate order_ids and handle them
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT order_id, COUNT(*) as cnt
    FROM deliveries
    GROUP BY order_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  -- If duplicates exist, keep only the most recent one per order
  IF duplicate_count > 0 THEN
    DELETE FROM deliveries
    WHERE id NOT IN (
      SELECT DISTINCT ON (order_id) id
      FROM deliveries
      ORDER BY order_id, created_at DESC
    );
  END IF;
END $$;

-- Add unique constraint on order_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'deliveries_order_id_key'
  ) THEN
    ALTER TABLE deliveries
    ADD CONSTRAINT deliveries_order_id_key UNIQUE (order_id);
  END IF;
END $$;

-- Recreate the sync_deliveries_on_order_update function to properly handle ON CONFLICT
CREATE OR REPLACE FUNCTION sync_deliveries_on_order_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if driver_id is set or status changed to out_for_delivery
  IF NEW.driver_id IS NOT NULL AND (OLD.driver_id IS NULL OR OLD.driver_id != NEW.driver_id) THEN
    -- Insert or update delivery record
    INSERT INTO deliveries (order_id, rider_id, status)
    VALUES (NEW.id, NEW.driver_id, 
            CASE 
              WHEN NEW.status = 'out_for_delivery' THEN 'assigned'
              WHEN NEW.status = 'completed' THEN 'delivered'
              ELSE 'assigned'
            END)
    ON CONFLICT (order_id) 
    DO UPDATE SET
      rider_id = NEW.driver_id,
      status = CASE 
        WHEN NEW.status = 'out_for_delivery' THEN 'assigned'
        WHEN NEW.status = 'completed' THEN 'delivered'
        ELSE deliveries.status
      END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trg_sync_deliveries_on_order_update ON orders;

CREATE TRIGGER trg_sync_deliveries_on_order_update
AFTER UPDATE OF status, completed_at, driver_id ON orders
FOR EACH ROW
EXECUTE FUNCTION sync_deliveries_on_order_update();

