-- Add categories column to stall; store selected category IDs

ALTER TABLE stall
ADD COLUMN IF NOT EXISTS categories uuid[] DEFAULT ARRAY[]::uuid[];


