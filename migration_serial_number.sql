-- Migration: Add serial_number column to equipment table
-- Run this in Supabase SQL Editor

-- Add the serial_number column
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS serial_number TEXT;

-- Optional: Add an index for faster lookups by serial number
CREATE INDEX IF NOT EXISTS idx_equipment_serial_number 
ON equipment(serial_number) 
WHERE serial_number IS NOT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'equipment' AND column_name = 'serial_number';
