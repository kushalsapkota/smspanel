# Quick Setup Checklist - Multi-Gateway SMS System

Use this checklist to track your implementation progress.

## Pre-Setup
- [ ] Backup database
- [ ] Have Global ZMS API credentials ready
- [ ] Note current Aakash SMS token

## Database Setup
- [ ] Open Supabase SQL Editor
- [ ] Copy contents from `supabase/migrations/20260214_multi_gateway_support.sql`
- [ ] Execute migration
- [ ] Verify new columns exist in `profiles` table
- [ ] Verify new settings exist in `settings` table

## Backend Deployment
- [ ] Deploy updated `send-sms` edge function
- [ ] Verify deployment successful
- [ ] Check edge function logs for errors

## Frontend Deployment
- [ ] Commit and push changes to repository
- [ ] Wait for automatic deployment (or build locally)
- [ ] Verify application loads without errors

## Configuration
- [ ] Login as admin
- [ ] Go to Admin → Settings
- [ ] Add/verify Aakash SMS Auth Token
- [ ] Add Global ZMS API Token
- [ ] Add Global ZMS Sender ID
- [ ] Save settings

## User Assignment
- [ ] Go to Admin → Users
- [ ] For each user:
  - [ ] Click edit button
  - [ ] Set Country
  - [ ] Set Gateway (Aakash SMS or Global ZMS)
  - [ ] Adjust rate if needed
  - [ ] Save

## Testing
- [ ] Test user with Aakash SMS:
  - [ ] Send test SMS
  - [ ] Verify SMS received
  - [ ] Check balance deducted
  - [ ] Verify SMS log shows "Aakash SMS"
  
- [ ] Test user with Global ZMS:
  - [ ] Send test SMS
  - [ ] Verify SMS received
  - [ ] Check balance deducted
  - [ ] Verify SMS log shows "Global ZMS"

## Verification
- [ ] Check SMS logs show gateway info
- [ ] Verify all users have country assigned
- [ ] Verify all users have gateway assigned
- [ ] Check edge function logs for errors
- [ ] Monitor for any issues

## Done!
- [ ] System is fully operational
- [ ] All tests passed
- [ ] Users can send SMS via assigned gateways

---

## Quick SQL Verification

```sql
-- Check profiles have new fields
SELECT user_id, country, sms_gateway FROM profiles LIMIT 5;

-- Check settings
SELECT * FROM settings WHERE key LIKE '%globalzms%';

-- Check recent SMS logs
SELECT created_at, gateway_used, status FROM sms_logs ORDER BY created_at DESC LIMIT 5;
```

## Quick Commands

```bash
# Deploy edge function
supabase functions deploy send-sms

# Restart dev server
npm run dev

# Build for production
npm run build
```

## Need Help?

See detailed instructions in `SETUP_MULTI_GATEWAY.md`
