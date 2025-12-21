# Database Migration Required

## Error
```
Error saving transaction: {}
```

## Root Cause
The `transactions` table in your Supabase database is missing the `additional_users` column that the application code expects.

## Quick Fix

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run This Migration
Click "New Query" and paste this SQL:

```sql
-- Add additional_users column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS additional_users text[];
```

Then click **Run** (or press Cmd+Enter on Mac / Ctrl+Enter on Windows)

### Step 3: Verify
Run this query to confirm the column was added:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
```

You should see `additional_users` with type `ARRAY` in the results.

### Step 4: Test
Go back to your app and try checking out equipment again. The error should be resolved.

---

## Optional: Run Other Pending Migrations

While you're in the SQL Editor, you might also want to run:

```sql
-- Add serial_number column to equipment table
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS serial_number text;
```

This adds support for manufacturer serial numbers on equipment.

---

## Need Help?
Use the `/database-setup` workflow for complete database setup instructions.
