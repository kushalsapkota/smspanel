-- Disable the topup trigger to prevent double-crediting
-- We'll rely on the Edge Function to handle balance updates instead

DROP TRIGGER IF EXISTS on_topup_approved ON public.topup_requests;
DROP FUNCTION IF EXISTS public.handle_topup_approval();
