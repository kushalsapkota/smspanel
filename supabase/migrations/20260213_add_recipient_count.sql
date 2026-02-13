-- Add recipient_count column to sms_logs table
ALTER TABLE public.sms_logs 
ADD COLUMN recipient_count INTEGER NOT NULL DEFAULT 1;

-- Update existing records to calculate recipient_count from comma-separated recipients
UPDATE public.sms_logs
SET recipient_count = (
  LENGTH(recipient) - LENGTH(REPLACE(recipient, ',', '')) + 1
);

-- Add comment to explain the column
COMMENT ON COLUMN public.sms_logs.recipient_count IS 'Number of recipients in this SMS (for comma-separated numbers)';
