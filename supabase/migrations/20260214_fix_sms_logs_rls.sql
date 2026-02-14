
-- Fix SMS Logs RLS Policies

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own sms logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Authenticated can insert sms logs" ON public.sms_logs;

-- Re-create policies with explicit Admin access
CREATE POLICY "Users can view own sms logs" ON public.sms_logs
  FOR SELECT USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Note: We used EXISTS query instead of helper function just to be 100% sure it works without function permissions issues,
-- though the helper function should work too. Safe approach.

CREATE POLICY "Authenticated can insert sms logs" ON public.sms_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
