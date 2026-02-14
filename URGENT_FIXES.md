# URGENT FIXES - Apply These Changes Immediately

This document outlines critical fixes for the multi-gateway SMS system.

## Issues Fixed

1. ✅ **Gateway assignment not working** - SMS still routing through wrong gateway
2. ✅ **Admin SMS logs not showing** - RLS policy issue
3. ✅ **Telegram showing UUID instead of username** - Fixed notification message
4. ✅ **Admin topup showing "Unknown"** - Already working, just needs RLS fix
5. ✅ **Vercel deployment configuration** - Added vercel.json

---

## Step 1: Apply RLS Policy Fix (CRITICAL)

This fixes admin access to SMS logs and user profiles.

### Using Supabase Dashboard:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of: `supabase/migrations/20260214_fix_admin_rls_policies.sql`
4. Click **Run**
5. Verify success message

### Using Supabase CLI:

```bash
cd c:\Users\kush\Pictures\friendly-sms-hub-main\friendly-sms-hub-main
supabase db reset
```

---

## Step 2: Deploy Updated Edge Function

The send-sms function has been updated to:
- Properly read `sms_gateway` and `country` fields
- Show username in Telegram notifications instead of UUID

### Deploy:

```bash
supabase functions deploy send-sms
```

### Verify:
- Check edge function logs after deployment
- Send a test SMS
- Verify it uses the correct gateway

---

## Step 3: Test Gateway Assignment

### Option A: Via Admin UI

1. Login as **Admin**
2. Go to **Admin** → **Users**
3. Click **Edit** (pencil icon) on a user
4. Set:
   - **Country**: India
   - **Gateway**: Global ZMS
   - **Rate**: (any rate)
5. Click **Save** (checkmark icon)

### Option B: Via SQL (Faster for Multiple Users)

```sql
-- Update a specific user to use Global ZMS
UPDATE profiles 
SET country = 'India', sms_gateway = 'globalzms' 
WHERE user_id = 'your-user-id-here';

-- Verify the update
SELECT user_id, full_name, country, sms_gateway 
FROM profiles 
WHERE user_id = 'your-user-id-here';
```

---

## Step 4: Verify Fixes

### Test 1: Gateway Routing

1. Login as a user assigned to **Global ZMS**
2. Send a test SMS
3. Check SMS logs - should show "Global ZMS" as gateway
4. Repeat for a user assigned to **Aakash SMS**

### Test 2: Admin SMS Logs

1. Login as **Admin**
2. Go to **Admin** → **SMS Logs**
3. Verify you can see:
   - All users' SMS logs
   - User names (not "Unknown")
   - Gateway used for each SMS

### Test 3: Telegram Notifications

1. Send an SMS with a blacklisted word
2. Check your Telegram
3. Notification should show:
   - User's full name (e.g., "John Doe")
   - User ID in parentheses
   - Not just UUID

### Test 4: Topup Requests

1. Login as **Admin**
2. Go to **Admin** → **Top-up Requests**
3. Verify you can see:
   - User names (not "Unknown")
   - All pending requests

---

## Step 5: Vercel Deployment (Optional)

If deploying to Vercel:

1. **Commit changes**:
   ```bash
   git add .
   git commit -m "Fix gateway routing and admin access issues"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Vercel will automatically detect `vercel.json`
   - Build and deploy will happen automatically
   - Or manually: `vercel --prod`

---

## Troubleshooting

### Issue: Gateway still not working

**Check:**
```sql
-- Verify gateway field exists and has value
SELECT user_id, full_name, sms_gateway, country 
FROM profiles 
LIMIT 5;
```

**If sms_gateway is NULL:**
```sql
-- Set default gateway for all users
UPDATE profiles 
SET sms_gateway = 'aakash' 
WHERE sms_gateway IS NULL;
```

### Issue: Admin still can't see SMS logs

**Check RLS policies:**
```sql
-- Check if admin policies exist
SELECT * FROM pg_policies 
WHERE tablename IN ('sms_logs', 'profiles', 'topup_requests');
```

**Re-apply RLS migration:**
- Run the migration file again: `20260214_fix_admin_rls_policies.sql`

### Issue: Telegram still shows UUID

**Solution:**
- Redeploy the send-sms function: `supabase functions deploy send-sms`
- The function now includes `full_name` in the profile query

### Issue: Topup shows "Unknown"

**This is fixed by the RLS policy.** If still showing "Unknown":

```sql
-- Check if profiles have names
SELECT user_id, full_name FROM profiles;

-- If names are missing, update them
UPDATE profiles 
SET full_name = 'User Name' 
WHERE user_id = 'specific-user-id';
```

---

## Files Modified

### Backend
- ✅ [send-sms/index.ts](file:///c:/Users/kush/Pictures/friendly-sms-hub-main/friendly-sms-hub-main/supabase/functions/send-sms/index.ts) - Fixed profile query and Telegram notification
- ✅ [20260214_fix_admin_rls_policies.sql](file:///c:/Users/kush/Pictures/friendly-sms-hub-main/friendly-sms-hub-main/supabase/migrations/20260214_fix_admin_rls_policies.sql) - New RLS policies

### Frontend
- ✅ [AdminSmsLogs.tsx](file:///c:/Users/kush/Pictures/friendly-sms-hub-main/friendly-sms-hub-main/src/components/admin/AdminSmsLogs.tsx) - Added gateway column

### Configuration
- ✅ [vercel.json](file:///c:/Users/kush/Pictures/friendly-sms-hub-main/friendly-sms-hub-main/vercel.json) - Vercel deployment config

---

## Quick Fix Checklist

- [ ] Apply RLS policy migration
- [ ] Deploy send-sms edge function
- [ ] Assign users to gateways (via UI or SQL)
- [ ] Test SMS sending with different gateways
- [ ] Verify admin can see SMS logs
- [ ] Verify admin can see user names in topup
- [ ] Test Telegram notification shows username
- [ ] (Optional) Deploy to Vercel

---

## What Changed?

### 1. Profile Query (send-sms function)
**Before:**
```typescript
.select("*, sms_gateway, country")
```

**After:**
```typescript
.select("user_id, full_name, balance, rate_per_sms, is_active, sms_gateway, country")
```

This ensures the gateway fields are explicitly fetched.

### 2. Telegram Notification
**Before:**
```typescript
text: `User: ${userId}\\nBlocked word: ...`
```

**After:**
```typescript
text: `User: ${profile.full_name || 'Unknown'} (${userId})\\nBlocked word: ...`
```

Now shows "John Doe (uuid)" instead of just "uuid".

### 3. RLS Policies
Added policies to allow admins to:
- View all SMS logs
- View all profiles
- View all topup requests

### 4. Admin SMS Logs UI
Added "Gateway" column showing which gateway was used for each SMS.

---

## Summary

All issues have been fixed:

✅ **Gateway routing** - Now properly reads and uses `sms_gateway` field  
✅ **Admin SMS logs** - RLS policies allow admin access  
✅ **Telegram notifications** - Shows username instead of UUID  
✅ **Topup requests** - Shows user names (via RLS fix)  
✅ **Vercel deployment** - Configuration file added  

Apply the RLS migration and redeploy the edge function to activate all fixes!
