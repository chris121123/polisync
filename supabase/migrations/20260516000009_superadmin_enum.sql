-- STEP 1 OF 2: Add 'superadmin' to the app_role enum
-- Run this FIRST, then run 008b_superadmin_policies.sql

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'superadmin';

-- Verification removed. Just run the ALTER TYPE command by itself.
