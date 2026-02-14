-- Fix Double-Credited Balances
-- This script divides all balances by 2 to fix the double-crediting issue
-- ONLY RUN THIS ONCE after deploying the fixed process-topup function

-- Backup current balances (optional, for safety)
-- You can check this table if you need to revert
CREATE TABLE IF NOT EXISTS balance_backup_20260214 AS 
SELECT user_id, balance, updated_at 
FROM public.profiles;

-- Fix the double-credited balances
-- This assumes ALL current balances were affected by the double-credit bug
UPDATE public.profiles
SET balance = balance / 2
WHERE balance > 0;

-- Verify the fix
SELECT 
    p.user_id,
    p.full_name,
    p.balance as current_balance,
    COALESCE(SUM(t.amount), 0) as total_topups
FROM public.profiles p
LEFT JOIN public.topup_requests t ON t.user_id = p.user_id AND t.status = 'approved'
GROUP BY p.user_id, p.full_name, p.balance
ORDER BY p.balance DESC;
