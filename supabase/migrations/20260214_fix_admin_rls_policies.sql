-- Fix RLS policies to allow admins to see all SMS logs and profiles
-- This migration fixes the issue where admins can't see SMS logs and user names

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all SMS logs" ON sms_logs;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Allow admins to view all SMS logs
CREATE POLICY "Admins can view all SMS logs"
  ON sms_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow admins to view all profiles (for topup requests and user management)
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Ensure admins can view topup requests with user information
DROP POLICY IF EXISTS "Admins can view all topup requests" ON topup_requests;

CREATE POLICY "Admins can view all topup requests"
  ON topup_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
