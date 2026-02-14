-- Create balance_adjustments table for tracking manual balance changes

CREATE TABLE IF NOT EXISTS public.balance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;

-- Only admins can view and insert adjustments
CREATE POLICY "Admins can manage balance adjustments" ON public.balance_adjustments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX idx_balance_adjustments_user_id ON public.balance_adjustments(user_id);
CREATE INDEX idx_balance_adjustments_created_at ON public.balance_adjustments(created_at DESC);
