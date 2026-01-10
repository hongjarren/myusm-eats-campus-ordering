-- Add status column to stall table for approval workflow
ALTER TABLE stall
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected'));

-- Add created_at timestamp for ordering if missing
ALTER TABLE stall
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Optional: ensure vendorid and cafeid have indexes to speed up admin/vendor queries
CREATE INDEX IF NOT EXISTS idx_stall_vendorid ON stall(vendorid);
CREATE INDEX IF NOT EXISTS idx_stall_cafeid ON stall(cafeid);

