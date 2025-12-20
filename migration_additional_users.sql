-- Add additional_users column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS additional_users text[];
