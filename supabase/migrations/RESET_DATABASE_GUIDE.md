# Database Reset Script - Usage Guide

## Overview

The `reset_database.sql` script will completely drop and rebuild your SMS Panel database. This is useful when you have database changes that can't be reverted and need a fresh start.

## ⚠️ WARNING

**This script will DELETE ALL DATA in your database!**

- All users will be removed
- All SMS logs will be deleted
- All top-up requests will be lost
- All API keys will be deleted
- All settings will be reset to defaults

**Make sure you have a backup if you need to preserve any data!**

## What the Script Does

### Step 1: Drop Everything
- Drops all triggers
- Drops all tables (in reverse dependency order)
- Drops all functions
- Drops all custom types/enums

### Step 2: Rebuild Schema
- Creates the `app_role` enum
- Creates all tables with proper structure:
  - `user_roles`
  - `profiles`
  - `topup_requests`
  - `sms_logs` (with `recipient_count` column)
  - `api_keys`
  - `blacklist_words`
  - `settings`
  - `notifications`
- Creates all functions:
  - `has_role()` - Check if user has a specific role
  - `handle_new_user()` - Auto-create profile on signup
  - `update_updated_at_column()` - Update timestamp trigger
- Creates all triggers
- Sets up all Row Level Security (RLS) policies
- Inserts default settings

## How to Run the Script

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `reset_database.sql`
5. Paste into the SQL editor
6. Click **Run** button
7. Wait for completion (should take a few seconds)

### Option 2: Using Supabase CLI

```bash
# Navigate to your project directory
cd c:\Users\kush\Pictures\friendly-sms-hub-main\friendly-sms-hub-main

# Run the migration
supabase db reset

# Or run the specific file
supabase db execute -f supabase/migrations/reset_database.sql
```

### Option 3: Using psql (Direct Database Connection)

```bash
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/migrations/reset_database.sql
```

## After Running the Script

### 1. Verify Tables Were Created

Run this query to check all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- api_keys
- blacklist_words
- notifications
- profiles
- settings
- sms_logs
- topup_requests
- user_roles

### 2. Create Admin User

After reset, you'll need to create a new admin user:

1. **Sign up** through your application at http://localhost:8080
2. **Run this SQL** to make your user an admin:

```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@example.com'
);
```

### 3. Configure Settings

Update your settings in the admin panel or via SQL:

```sql
UPDATE public.settings 
SET value = 'your-aakash-token-here' 
WHERE key = 'aakash_auth_token';

UPDATE public.settings 
SET value = 'your-telegram-bot-token' 
WHERE key = 'telegram_bot_token';

UPDATE public.settings 
SET value = 'your-telegram-chat-id' 
WHERE key = 'telegram_chat_id';
```

## Troubleshooting

### Error: "cannot drop type app_role because other objects depend on it"

This means there are still references to the type. The script handles this with `CASCADE`, but if you still see this error, run:

```sql
DROP TYPE IF EXISTS public.app_role CASCADE;
```

### Error: "trigger does not exist"

This is normal if running the script multiple times. The `IF EXISTS` clauses handle this gracefully.

### Error: "relation already exists"

This means the tables weren't fully dropped. Run the DROP section of the script again:

```sql
-- Run just the DROP section (lines 1-30 of reset_database.sql)
```

## Database Schema Summary

After running the script, you'll have:

- **8 tables** with full RLS policies
- **3 functions** for security and automation
- **3 triggers** for auto-profile creation and timestamps
- **1 enum type** for user roles (admin/user)
- **Default settings** pre-populated

## Need Help?

If you encounter any issues:
1. Check the Supabase logs in the dashboard
2. Verify your database connection
3. Make sure you have proper permissions
4. Try running the script in smaller sections if needed

---

**File Location:** `supabase/migrations/reset_database.sql`
