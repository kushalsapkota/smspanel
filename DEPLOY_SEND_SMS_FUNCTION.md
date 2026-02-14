# Deploy Updated send-sms Function - Manual Steps

Since Supabase CLI is not installed, follow these steps to deploy manually:

## Option 1: Using Supabase Dashboard (Recommended)

### Step 1: Open Edge Functions

1. Go to your Supabase project dashboard
2. Click on **Edge Functions** in the left sidebar
3. Find the `send-sms` function

### Step 2: Deploy New Version

1. Click on the `send-sms` function
2. Click **Deploy new version** or **Edit**
3. Delete all existing code
4. Copy the ENTIRE contents of: `supabase/functions/send-sms/index.ts`
5. Paste into the editor
6. Click **Deploy** or **Save**

### Step 3: Verify Deployment

1. Go to the **Logs** tab
2. Send a test SMS
3. Check for errors in the logs

---

## Option 2: Install Supabase CLI

### Windows Installation:

```powershell
# Using Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# OR using npm
npm install -g supabase
```

### After Installation:

```bash
# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy function
supabase functions deploy send-sms
```

---

## Troubleshooting

### If you still get "No valid recipients":

The issue might be with the Global ZMS API endpoint or parameters. We need to verify:

1. **Is the API endpoint correct?**
   - Current: `https://globalzms.com/api/http/sms/send`
   - Check your Global ZMS dashboard for the correct endpoint

2. **Are the parameters correct?**
   - Current parameters: `api_token`, `recipient`, `sender_id`, `type`, `message`
   - Check your Global ZMS API documentation

3. **Is the API token valid?**
   - Go to Admin → Settings
   - Verify Global ZMS API Token is correct
   - Try regenerating the token in Global ZMS dashboard

### Check Edge Function Logs:

1. Go to Supabase Dashboard → Edge Functions → send-sms
2. Click **Logs** tab
3. Look for `[Global ZMS] Response:` in the logs
4. This will show the actual error from Global ZMS

---

## Alternative: Provide Your Global ZMS API Details

If you can provide:
1. The actual Global ZMS API endpoint URL
2. The required parameters
3. An example API request

I can update the code to match your specific Global ZMS API format.

---

## Quick Test

After deploying, test with this SQL query to verify user assignment:

```sql
-- Check user's gateway assignment
SELECT user_id, full_name, country, sms_gateway 
FROM profiles 
WHERE user_id = auth.uid();
```

Expected result:
- country: 'India'
- sms_gateway: 'globalzms'
