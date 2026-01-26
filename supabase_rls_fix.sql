/*
  SQL FIX FOR SUPABASE RLS
  
  Please run this script in your Supabase SQL Editor.
  It will fix the deletion permission issues for admins.
*/

-- 1. Enable RLS (Should already be enabled)
ALTER TABLE temperature_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_temperature_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies (To be safe)
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON temperature_logs;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON temperature_logs;

-- 3. Create NEW permissive policies for Admins

-- Policy: Allow Admins to DELETE any temperature log
CREATE POLICY "Admins can delete any temperature log"
ON temperature_logs
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Policy: Allow Admins to DELETE any room (and cassette delete logs ideally)
CREATE POLICY "Admins can delete rooms"
ON rooms
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Policy: Allow Admins to DELETE any equipment
CREATE POLICY "Admins can delete equipment"
ON equipment
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- For debugging only: If you just want it to work for ALL authenticated users temporarily:
-- CREATE POLICY "Enable delete for all authenticated users" ON temperature_logs FOR DELETE USING (auth.role() = 'authenticated');
