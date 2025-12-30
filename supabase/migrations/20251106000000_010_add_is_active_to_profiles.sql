-- Add is_active column to profiles table to support blocking/unblocking users
-- Default to true for existing users

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
    
    -- Update all existing records to have is_active = true
    UPDATE profiles SET is_active = true WHERE is_active IS NULL;
    
    COMMENT ON COLUMN profiles.is_active IS 'User account status - false means blocked';
  END IF;
END $$;
