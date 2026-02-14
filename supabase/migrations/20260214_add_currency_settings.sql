-- ============================================================================
-- Add Currency Configuration to Settings
-- ============================================================================
-- This migration adds currency settings to allow admins to configure
-- the currency symbol and code used throughout the application
-- ============================================================================

-- Add default currency settings
INSERT INTO public.settings (key, value) VALUES
  ('currency_symbol', '₹'),
  ('currency_code', 'INR')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- NOTES
-- ============================================================================
-- After running this migration, admins can change the currency in:
-- Admin Panel → Settings
--
-- Supported currencies examples:
-- - USD: symbol = '$', code = 'USD'
-- - EUR: symbol = '€', code = 'EUR'
-- - GBP: symbol = '£', code = 'GBP'
-- - INR: symbol = '₹', code = 'INR'
-- - NPR: symbol = '₨', code = 'NPR'
-- - JPY: symbol = '¥', code = 'JPY'
