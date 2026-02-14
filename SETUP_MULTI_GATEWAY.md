# Multi-Gateway SMS System - Setup Guide

This guide will walk you through implementing the multi-gateway SMS system on your existing installation.

## Prerequisites

- Existing SMS panel installation running
- Access to Supabase dashboard or CLI
- Admin access to the application
- Global ZMS API credentials (if using Global ZMS)

---

## Step 1: Backup Your Database

**IMPORTANT:** Always backup before making schema changes!

### Using Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Backups**
3. Click **Create Backup** or note the latest automatic backup

### Using Supabase CLI:
```bash
supabase db dump -f backup_before_multigateway.sql
```

---

## Step 2: Apply Database Migration

### Option A: Using Supabase Dashboard (Recommended for Production)

1. **Open SQL Editor**:
   - Go to Supabase Dashboard → **SQL Editor**
   - Click **New Query**

2. **Copy Migration SQL**:
   - Open the file: `supabase/migrations/20260214_multi_gateway_support.sql`
   - Copy the entire contents

3. **Execute Migration**:
   - Paste the SQL into the editor
   - Click **Run** or press `Ctrl+Enter`
   - Wait for "Success" message

4. **Verify Changes**:
   ```sql
   -- Check if new columns exist
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'profiles' 
   AND column_name IN ('country', 'sms_gateway');
   
   -- Check if new settings exist
   SELECT key, value FROM settings 
   WHERE key IN ('globalzms_api_token', 'globalzms_sender_id');
   ```

### Option B: Using Supabase CLI (Development)

```bash
# Navigate to project directory
cd c:\Users\kush\Pictures\friendly-sms-hub-main\friendly-sms-hub-main

# Reset database (applies all migrations)
supabase db reset

# OR apply specific migration
supabase migration up
```

---

## Step 3: Deploy Updated Edge Function

### Using Supabase CLI:

```bash
# Deploy the updated send-sms function
supabase functions deploy send-sms

# Verify deployment
supabase functions list
```

### Using Supabase Dashboard:

1. Go to **Edge Functions** in Supabase Dashboard
2. Find `send-sms` function
3. Click **Deploy new version**
4. Upload the file: `supabase/functions/send-sms/index.ts`
5. Click **Deploy**

---

## Step 4: Update Frontend Application

### If Using Vercel/Netlify/Other Hosting:

1. **Commit Changes**:
   ```bash
   git add .
   git commit -m "Add multi-gateway SMS support"
   git push origin main
   ```

2. **Automatic Deployment**:
   - Your hosting platform will automatically deploy
   - Wait for deployment to complete

### If Running Locally:

1. **Restart Dev Server**:
   ```bash
   # Stop current server (Ctrl+C)
   # Start again
   npm run dev
   ```

2. **Build for Production** (optional):
   ```bash
   npm run build
   ```

---

## Step 5: Configure SMS Gateways

### 5.1 Configure Aakash SMS (Existing)

1. Log in as **Admin**
2. Go to **Admin** → **Settings**
3. Verify **Aakash SMS Auth Token** is filled
4. If empty, add your Aakash SMS token
5. Click **Save Settings**

### 5.2 Configure Global ZMS (New)

1. **Get Global ZMS Credentials**:
   - Sign up at https://globalzms.com
   - Get your API Token from the dashboard
   - Choose a Sender ID (alphanumeric, max 11 characters)

2. **Add to Settings**:
   - Go to **Admin** → **Settings**
   - Find **Global ZMS API Token** field
   - Paste your API token
   - Find **Global ZMS Sender ID** field
   - Enter your sender ID (e.g., "YourBrand")
   - Click **Save Settings**

---

## Step 6: Assign Users to Gateways

### 6.1 Assign Existing Users

1. Go to **Admin** → **Users**
2. For each user, click the **Edit** button (pencil icon)
3. You'll see new dropdowns:
   - **Country**: Select user's country (Nepal, India, Bangladesh, etc.)
   - **Gateway**: Select SMS gateway (Aakash SMS or Global ZMS)
   - **Rate/SMS**: Adjust if needed
4. Click **Save** (checkmark icon)

### 6.2 Recommended Gateway Assignments

| Country      | Recommended Gateway | Why                           |
|--------------|---------------------|-------------------------------|
| India        | Global ZMS          | Better rates for India        |
| Nepal        | Aakash SMS          | Optimized for Nepal           |
| Bangladesh   | Global ZMS          | Better international coverage |
| Pakistan     | Global ZMS          | Better international coverage |
| Other        | Global ZMS          | Global coverage               |

### 6.3 Bulk Update (Optional - SQL)

If you have many users to update:

```sql
-- Assign all users to Aakash SMS by default
UPDATE profiles 
SET country = 'Nepal', sms_gateway = 'aakash' 
WHERE country IS NULL;

-- Assign specific users to Global ZMS
UPDATE profiles 
SET country = 'India', sms_gateway = 'globalzms' 
WHERE user_id IN ('user-id-1', 'user-id-2');
```

---

## Step 7: Test the System

### 7.1 Test Aakash SMS Gateway

1. **Login as a user assigned to Aakash SMS**
2. Go to **Send SMS**
3. Send a test message to your number
4. Verify:
   - ✅ SMS is received
   - ✅ Balance is deducted
   - ✅ SMS log shows "Aakash SMS" as gateway

### 7.2 Test Global ZMS Gateway

1. **Login as a user assigned to Global ZMS**
2. Go to **Send SMS**
3. Send a test message to your number
4. Verify:
   - ✅ SMS is received
   - ✅ Balance is deducted
   - ✅ SMS log shows "Global ZMS" as gateway

### 7.3 Check SMS Logs

1. Go to **SMS Logs** (user or admin panel)
2. Verify each log shows:
   - Gateway used (Aakash SMS or Global ZMS)
   - Correct cost
   - Correct recipient count
   - Success/failure status

---

## Step 8: Monitor and Verify

### Check Database Records

```sql
-- View users and their gateway assignments
SELECT 
  full_name, 
  country, 
  sms_gateway, 
  balance, 
  rate_per_sms 
FROM profiles 
ORDER BY created_at DESC;

-- View recent SMS logs with gateway info
SELECT 
  created_at,
  recipient,
  status,
  cost,
  gateway_used,
  gateway_response->>'status' as gateway_status
FROM sms_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Count SMS by gateway
SELECT 
  gateway_used, 
  COUNT(*) as total_sms,
  SUM(cost) as total_cost
FROM sms_logs 
GROUP BY gateway_used;
```

### Check Application Logs

1. **Supabase Edge Function Logs**:
   - Go to Supabase Dashboard → **Edge Functions**
   - Click on `send-sms`
   - View **Logs** tab
   - Look for successful gateway routing

2. **Browser Console** (if testing locally):
   - Open browser DevTools (F12)
   - Check for any errors
   - Verify API calls are successful

---

## Troubleshooting

### Issue: Migration Fails

**Error**: Column already exists or constraint violation

**Solution**:
```sql
-- Check if columns already exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles';

-- If columns exist, skip migration or manually add missing parts
```

### Issue: SMS Not Sending via Global ZMS

**Possible Causes**:
1. Invalid API token
2. Sender ID not approved
3. Insufficient credits

**Solution**:
1. Verify API token in Settings
2. Check Global ZMS dashboard for sender ID status
3. Check account balance
4. Review edge function logs for error details

### Issue: User Still Using Old Gateway

**Solution**:
```sql
-- Force update user's gateway
UPDATE profiles 
SET sms_gateway = 'globalzms' 
WHERE user_id = 'specific-user-id';
```

### Issue: Gateway Response Not Logged

**Solution**:
- Check edge function logs
- Verify `gateway_response` column exists in `sms_logs` table
- Re-apply migration if needed

---

## Rollback Instructions

If you need to rollback the changes:

### 1. Restore Database Backup

```bash
# Using Supabase CLI
supabase db reset --db-url "your-backup-url"
```

Or use Supabase Dashboard → Database → Backups → Restore

### 2. Revert Edge Function

```bash
# Deploy previous version
git checkout HEAD~1 supabase/functions/send-sms/index.ts
supabase functions deploy send-sms
```

### 3. Revert Frontend

```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

---

## Post-Setup Checklist

- [ ] Database migration applied successfully
- [ ] Edge function deployed
- [ ] Frontend application updated
- [ ] Aakash SMS configured in settings
- [ ] Global ZMS configured in settings
- [ ] Test users assigned to gateways
- [ ] Test SMS sent via Aakash SMS successfully
- [ ] Test SMS sent via Global ZMS successfully
- [ ] SMS logs showing correct gateway info
- [ ] Balance deduction working correctly
- [ ] All existing users have country and gateway assigned

---

## Support

If you encounter issues:

1. **Check Logs**:
   - Supabase Edge Function logs
   - Browser console logs
   - Database query results

2. **Verify Configuration**:
   - Settings table has all required keys
   - API tokens are correct
   - Users have valid gateway assignments

3. **Test Incrementally**:
   - Test one gateway at a time
   - Test with one user first
   - Gradually roll out to all users

---

## Next Steps (Optional)

After successful setup, consider:

1. **Analytics Dashboard**:
   - Add country-based filtering
   - Show gateway usage statistics
   - Monitor success/failure rates per gateway

2. **Auto-Assignment Rules**:
   - Automatically assign gateway based on country
   - Set default gateway per country in settings

3. **Gateway Health Monitoring**:
   - Monitor gateway uptime
   - Automatic failover to backup gateway
   - Alert admins if gateway is down

4. **Cost Optimization**:
   - Compare costs between gateways
   - Route SMS through cheaper gateway when possible
   - Set different rates per gateway

---

## Summary

You've successfully implemented the multi-gateway SMS system! Your panel now supports:

✅ Multiple SMS gateways (Aakash SMS + Global ZMS)  
✅ User-level gateway assignment  
✅ Country-based organization  
✅ Automatic SMS routing  
✅ Gateway tracking in logs  
✅ Flexible configuration  

Your users can now send SMS through their assigned gateways, and you have full admin control over the routing!
