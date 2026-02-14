-- Multi-Gateway SMS Support Migration
-- Adds support for multiple SMS gateways (Aakash SMS, Global ZMS)
-- Adds country field for user categorization

-- Add country and gateway fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN country TEXT DEFAULT 'Nepal',
  ADD COLUMN sms_gateway TEXT DEFAULT 'aakash' CHECK (sms_gateway IN ('aakash', 'globalzms'));

-- Add gateway tracking to sms_logs
ALTER TABLE public.sms_logs
  ADD COLUMN gateway_used TEXT,
  ADD COLUMN gateway_response JSONB;

-- Rename old aakash_response column for backward compatibility
ALTER TABLE public.sms_logs
  RENAME COLUMN aakash_response TO gateway_response_legacy;

-- Add Global ZMS settings
INSERT INTO public.settings (key, value) VALUES
  ('globalzms_api_token', ''),
  ('globalzms_sender_id', 'SMS')
ON CONFLICT (key) DO NOTHING;

-- Create indexes for faster country-based and gateway-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_gateway ON public.profiles(sms_gateway);
CREATE INDEX IF NOT EXISTS idx_sms_logs_gateway ON public.sms_logs(gateway_used);
CREATE INDEX IF NOT EXISTS idx_sms_logs_country ON public.sms_logs(user_id, gateway_used);
