# Quick Fix Guide - Apply These Now

## Issue 1: Admin Can't See SMS Logs & "Unknown" in Topups

**Solution:** Apply RLS Policy Migration

### Steps:

1. **Open Supabase Dashboard**
2. Go to **SQL Editor**
3. Click **New Query**
4. **Copy and paste this SQL:**

```sql
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
```

5. Click **Run** or press `Ctrl+Enter`
6. Wait for "Success" message
7. **Refresh your admin panel**
8. Check **SMS Logs** - should now show logs
9. Check **Top-up Requests** - should now show names instead of "Unknown"

---

## Issue 2: Global ZMS "No Valid Recipients"

**You need to deploy the updated send-sms function first!**

### Steps:

1. **Open Supabase Dashboard**
2. Go to **Edge Functions**
3. Click on **send-sms** function
4. Click **Edit** or **Deploy new version**
5. **Delete all existing code**
6. **Copy the entire code from:** `supabase/functions/send-sms/index.ts`
   - (I showed you the full code in the previous message - 273 lines)
7. **Paste** into the editor
8. Click **Deploy**
9. Wait for deployment to complete

### After Deployment:

1. Go to **Logs** tab in the send-sms function
2. Login as a user assigned to Global ZMS
3. Send a test SMS to: `9152000061`
4. Check the logs for `[Global ZMS] Response:`
5. This will show the actual error from Global ZMS

---

## Issue 3: Apply Multi-Gateway Migration

If you haven't applied the multi-gateway migration yet:

### Steps:

1. **Open Supabase Dashboard**
2. Go to **SQL Editor**
3. Click **New Query**
4. **Copy and paste from:** `supabase/migrations/20260214_multi_gateway_support.sql`
5. Click **Run**
6. Wait for "Success"

---

## Quick Verification

After applying all fixes:

### Check 1: SMS Logs Visible
- Admin → SMS Logs
- Should see logs (not "No SMS logs")

### Check 2: Topup Shows Names
- Admin → Top-up Requests
- Should show user names (not "Unknown")

### Check 3: Gateway Assignment Working
```sql
-- Run this in SQL Editor
SELECT user_id, full_name, country, sms_gateway 
FROM profiles 
LIMIT 5;
```

Should show:
- country: 'India' or 'Nepal'
- sms_gateway: 'globalzms' or 'aakash'

### Check 4: Send Test SMS
- Login as user with Global ZMS
- Send SMS to Indian number: `9152000061`
- Check if it sends or shows error
- Check Edge Function logs for details

---

## Priority Order

1. ✅ **Apply RLS Policy** (fixes SMS logs & topup names)
2. ✅ **Deploy send-sms function** (fixes Global ZMS routing)
3. ✅ **Test SMS sending**
4. ✅ **Check logs** for any errors

Do these in order and let me know what happens!
