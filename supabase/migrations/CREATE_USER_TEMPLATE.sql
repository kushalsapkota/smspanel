-- ============================================================================
-- SQL TEMPLATE FOR CREATING NEW USERS
-- ============================================================================
-- Use this template when you need to create a new customer/user account
-- Follow the steps in the Admin Panel "How to Create Users" guide
-- ============================================================================

-- STEP 1: Create the user in Supabase Dashboard
-- Go to: Supabase Dashboard → Authentication → Add User
-- Fill in:
--   - Email: customer@example.com
--   - Password: (secure password)
--   - Auto Confirm User: ✓ (checked)
--
-- After creating, copy the User ID (UUID) from the user details

-- STEP 2: Run the following SQL commands
-- Replace the placeholder values with actual data:
--   - USER_ID_HERE: The UUID you copied from step 1
--   - Customer Name: Full name of the customer
--   - 100.00: Initial balance amount (in your currency)
--   - 1.50: Rate per SMS for this customer

-- Create the user profile
INSERT INTO public.profiles (user_id, full_name, balance, rate_per_sms, is_active)
VALUES (
  'USER_ID_HERE',    -- Replace with actual User ID from Supabase Auth
  'Customer Name',   -- e.g., 'John Doe' or 'ABC Company'
  100.00,           -- Initial balance (e.g., 100.00)
  1.50,             -- Rate per SMS (e.g., 1.50)
  true              -- Active status (true = active, false = inactive)
);

-- Assign user role
INSERT INTO public.user_roles (user_id, role)
VALUES (
  'USER_ID_HERE',   -- Same User ID as above
  'user'            -- Role: 'user' for customers, 'admin' for administrators
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running the above SQL, verify the user was created correctly:

-- Check if profile was created
SELECT * FROM public.profiles WHERE user_id = 'USER_ID_HERE';

-- Check if role was assigned
SELECT * FROM public.user_roles WHERE user_id = 'USER_ID_HERE';

-- ============================================================================
-- EXAMPLE: Creating a user with specific details
-- ============================================================================
-- Let's say you created a user in Supabase Auth with:
--   Email: john@example.com
--   User ID: 123e4567-e89b-12d3-a456-426614174000
--
-- Here's how you would fill in the template:

/*
INSERT INTO public.profiles (user_id, full_name, balance, rate_per_sms, is_active)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'John Doe',
  250.00,
  1.25,
  true
);

INSERT INTO public.user_roles (user_id, role)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'user'
);
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. The user can log in immediately after these SQL commands are run
-- 2. They will see their balance and rate on the dashboard
-- 3. To make a user an admin, use role = 'admin' instead of 'user'
-- 4. You can update balance and rate later from the Admin Panel UI
-- 5. To deactivate a user, use the "Deactivate" button in Admin Panel
--    or run: UPDATE public.profiles SET is_active = false WHERE user_id = 'USER_ID';
