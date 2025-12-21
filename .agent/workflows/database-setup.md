---
description: Setup and update Supabase database schema
---

# Database Setup Guide

This guide helps you set up and update your Supabase database schema.

## Initial Setup (If database is empty)

1. **Go to Supabase SQL Editor**
   - Open https://app.supabase.com
   - Select your project
   - Go to **SQL Editor** in the left sidebar

2. **Run the main schema**
   ```sql
   -- Copy and paste the contents of supabase_schema.sql
   ```

## Apply Migrations (For existing database)

### Migration 1: Add additional_users column

**File:** `migration_additional_users.sql`

```sql
-- Add additional_users column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS additional_users text[];
```

**How to run:**
1. Go to Supabase SQL Editor
2. Click "New Query"
3. Copy and paste the SQL above
4. Click "Run" or press Cmd+Enter

### Migration 2: Add serial_number column

**File:** `migration_serial_number.sql`

```sql
-- Add serial_number column to equipment table
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS serial_number text;
```

**How to run:**
1. Go to Supabase SQL Editor
2. Click "New Query"
3. Copy and paste the SQL above
4. Click "Run" or press Cmd+Enter

## Verify Migrations

After running migrations, verify the columns exist:

```sql
-- Check transactions table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions';

-- Check equipment table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'equipment';
```

## Common Issues

### Issue: "Failed to fetch" error
**Solution:** Check that your `.env.local` file has correct Supabase credentials

### Issue: "Error saving transaction: {}"
**Solution:** Run the `migration_additional_users.sql` migration

### Issue: Column already exists
**Solution:** This is fine! The `IF NOT EXISTS` clause prevents errors if the column already exists.
