
-- Automate Top-up Balance Updates

-- Create a function that runs when a topup_request is updated
CREATE OR REPLACE FUNCTION public.handle_topup_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only proceed if status changed FROM something other than 'approved' TO 'approved'
  -- This prevents double-crediting if the row is updated again after approval
  IF (OLD.status IS NULL OR OLD.status != 'approved') AND NEW.status = 'approved' THEN
    -- Update the user's balance
    UPDATE public.profiles
    SET balance = balance + NEW.amount
    WHERE user_id = NEW.user_id;
    
    -- Log for debugging (optional)
    RAISE NOTICE 'Topup approved: user_id=%, amount=%', NEW.user_id, NEW.amount;
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_topup_approved ON public.topup_requests;

CREATE TRIGGER on_topup_approved
  AFTER UPDATE ON public.topup_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_topup_approval();
