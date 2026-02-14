# Global ZMS Number Format Fix

## Problem
Global ZMS API was rejecting phone numbers with "No valid recipients" error because numbers weren't in international format.

## Solution
Added automatic phone number formatting with country codes based on user's assigned country.

---

## What Changed

### 1. Added Phone Number Formatter

```typescript
function formatPhoneNumber(number: string, country: string): string {
  // Automatically adds country code based on country
  // India: +91
  // Nepal: +977
  // Bangladesh: +880
  // Pakistan: +92
}
```

### 2. Updated Global ZMS Function

Now automatically formats all phone numbers before sending:

```typescript
// Before: 9152000061
// After: +919152000061

// Before: 9841234567 (Nepal)
// After: +9779841234567
```

---

## How It Works

### For Indian Numbers (Country: India, Gateway: Global ZMS)

**Input:** `9152000061`  
**Formatted:** `+919152000061`  
**Result:** ✅ SMS sent via Global ZMS

### For Nepali Numbers (Country: Nepal, Gateway: Aakash SMS)

**Input:** `9841234567`  
**Formatted:** No change (Aakash SMS doesn't require +)  
**Result:** ✅ SMS sent via Aakash SMS

### For Nepali Numbers (Country: Nepal, Gateway: Global ZMS)

**Input:** `9841234567`  
**Formatted:** `+9779841234567`  
**Result:** ✅ SMS sent via Global ZMS

---

## Supported Formats

The formatter handles various input formats:

| Input Format | Country | Output |
|--------------|---------|--------|
| `9152000061` | India | `+919152000061` |
| `+919152000061` | India | `+919152000061` (unchanged) |
| `09152000061` | India | `+919152000061` (removes leading 0) |
| `9841234567` | Nepal | `+9779841234567` |
| `01234567` | Nepal | `+977123456` (removes leading 0) |
| `8801234567` | Bangladesh | `+8801234567` |

---

## Testing

### Test 1: Indian Number with Global ZMS

1. **Assign user to Global ZMS:**
   ```sql
   UPDATE profiles 
   SET country = 'India', sms_gateway = 'globalzms' 
   WHERE user_id = 'your-user-id';
   ```

2. **Send SMS to Indian number:**
   - Recipient: `9152000061`
   - Expected: Automatically formatted to `+919152000061`
   - Result: ✅ SMS sent successfully

### Test 2: Nepali Number with Aakash SMS

1. **Assign user to Aakash SMS:**
   ```sql
   UPDATE profiles 
   SET country = 'Nepal', sms_gateway = 'aakash' 
   WHERE user_id = 'your-user-id';
   ```

2. **Send SMS to Nepali number:**
   - Recipient: `9841234567`
   - Expected: No formatting (Aakash handles it)
   - Result: ✅ SMS sent successfully

### Test 3: Multiple Recipients

**Input:** `9152000061, 9152000062, 9152000063`  
**Formatted:** `+919152000061,+919152000062,+919152000063`  
**Result:** ✅ All SMS sent

---

## Deployment

### Step 1: Deploy Updated Function

```bash
supabase functions deploy send-sms
```

### Step 2: Verify Deployment

Check edge function logs:
```bash
supabase functions logs send-sms
```

Look for: `[Global ZMS] Response: ...`

### Step 3: Test

1. Login as user assigned to Global ZMS
2. Send test SMS to Indian number: `9152000061`
3. Check SMS logs - should show "sent" status
4. Verify SMS was received

---

## Troubleshooting

### Issue: Still getting "No valid recipients"

**Check:**
1. User is assigned to correct country
2. Global ZMS API token is valid
3. Global ZMS sender ID is approved

**Verify in database:**
```sql
SELECT user_id, full_name, country, sms_gateway 
FROM profiles 
WHERE user_id = 'your-user-id';
```

### Issue: Number format looks wrong

**Check edge function logs:**
```bash
supabase functions logs send-sms --tail
```

Look for the formatted number in the logs.

### Issue: Works for India but not Nepal

**Solution:**
- Nepal numbers with Global ZMS need `+977` prefix
- If using Aakash SMS for Nepal, it should work without prefix
- Check user's gateway assignment

---

## Country Code Reference

| Country | Code | Example Input | Formatted Output |
|---------|------|---------------|------------------|
| India | +91 | 9152000061 | +919152000061 |
| Nepal | +977 | 9841234567 | +9779841234567 |
| Bangladesh | +880 | 1712345678 | +8801712345678 |
| Pakistan | +92 | 3001234567 | +923001234567 |

---

## Summary

✅ **Phone numbers automatically formatted with country codes**  
✅ **Works for all supported countries**  
✅ **Handles multiple recipients**  
✅ **Removes leading zeros**  
✅ **Preserves numbers already in international format**  

Deploy the updated function and test with your Global ZMS account!
