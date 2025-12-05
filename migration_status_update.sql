-- Update the status check constraint to include new statuses
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_status_check;
ALTER TABLE equipment ADD CONSTRAINT equipment_status_check 
  CHECK (status IN ('AVAILABLE', 'CHECKED_OUT', 'MAINTENANCE', 'MISSING', 'PENDING_VERIFICATION', 'DAMAGED', 'LOST'));
