-- ROBUST MIGRATION SCRIPT
-- Run this entire script in Supabase SQL Editor

-- 1. First, drop the existing constraint so we can modify data freely
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Update known old roles to new roles
UPDATE users SET role = 'CREW' WHERE role = 'STAFF';
UPDATE users SET role = 'ADMIN' WHERE role = 'VIEWER';

-- 3. SAFETY NET: Update ANY other invalid role to 'CREW' to prevent constraint violation
-- This ensures that no row is left behind with an invalid role
UPDATE users 
SET role = 'CREW' 
WHERE role NOT IN ('ADMIN', 'MANAGER', 'CREW');

-- 4. Now it is safe to add the new constraint
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'MANAGER', 'CREW'));

-- 5. Verify the changes
SELECT * FROM users;
