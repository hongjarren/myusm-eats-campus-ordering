-- Migration: Add stall_update_requests table for vendor stall change approvals
-- Created: 2025-11-10

CREATE TABLE IF NOT EXISTS public.stall_update_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stall_id UUID NOT NULL REFERENCES public.stall(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- New values requested by vendor
  new_stallname TEXT,
  new_contact TEXT,
  new_operation_days TEXT[],
  new_open_time TEXT,
  new_close_time TEXT,
  new_imageurl TEXT,
  new_description TEXT,
  
  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_comment TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_stall_update_requests_status ON public.stall_update_requests(status);
CREATE INDEX IF NOT EXISTS idx_stall_update_requests_vendor ON public.stall_update_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_stall_update_requests_stall ON public.stall_update_requests(stall_id);

-- RLS policies
ALTER TABLE public.stall_update_requests ENABLE ROW LEVEL SECURITY;

-- Vendors can view their own requests
CREATE POLICY "Vendors can view own requests"
  ON public.stall_update_requests
  FOR SELECT
  USING (auth.uid() = vendor_id);

-- Vendors can insert their own requests
CREATE POLICY "Vendors can insert own requests"
  ON public.stall_update_requests
  FOR INSERT
  WITH CHECK (auth.uid() = vendor_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
  ON public.stall_update_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update requests"
  ON public.stall_update_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to apply approved changes to stall
CREATE OR REPLACE FUNCTION apply_stall_update(request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req RECORD;
BEGIN
  -- Get the request details
  SELECT * INTO req FROM stall_update_requests WHERE id = request_id AND status = 'approved';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not approved';
  END IF;
  
  -- Update the stall with new values
  UPDATE stall
  SET
    stallname = COALESCE(req.new_stallname, stallname),
    contact = COALESCE(req.new_contact, contact),
    operation_days = COALESCE(req.new_operation_days, operation_days),
    open_time = COALESCE(req.new_open_time, open_time),
    close_time = COALESCE(req.new_close_time, close_time),
    imageurl = COALESCE(req.new_imageurl, imageurl),
    description = COALESCE(req.new_description, description)
  WHERE id = req.stall_id;
END;
$$;

-- Trigger to automatically apply changes when request is approved
CREATE OR REPLACE FUNCTION trigger_apply_stall_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    PERFORM apply_stall_update(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER apply_stall_update_on_approval
AFTER UPDATE ON stall_update_requests
FOR EACH ROW
EXECUTE FUNCTION trigger_apply_stall_update();
