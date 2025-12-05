-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Equipment Table
create table if not exists equipment (
  id text primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  barcode text unique not null,
  status text not null check (status in ('AVAILABLE', 'CHECKED_OUT', 'MAINTENANCE', 'MISSING', 'PENDING_VERIFICATION', 'DAMAGED', 'LOST')),
  location text,
  condition text,
  assigned_to text,
  last_activity timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Create Users Table
create table if not exists users (
  id text primary key default uuid_generate_v4(),
  name text not null,
  role text not null check (role in ('ADMIN', 'MANAGER', 'CREW')),
  email text unique not null,
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- Create Transactions Table
create table if not exists transactions (
  id text primary key default uuid_generate_v4(),
  user_id text references users(id),
  items text[] not null, -- Array of equipment IDs
  timestamp_out timestamp with time zone default now(),
  timestamp_in timestamp with time zone,
  project text,
  pre_checkout_conditions jsonb,
  post_return_conditions jsonb,
  status text not null check (status in ('OPEN', 'CLOSED')),
  notes text
);

-- Create Logs Table
create table if not exists logs (
  id text primary key default uuid_generate_v4(),
  action text not null,
  details text,
  user_id text references users(id),
  timestamp timestamp with time zone default now()
);

-- Insert Mock Data (Optional - for testing)
insert into users (id, name, role, email) values 
('u1', 'Alice Crew', 'CREW', 'alice@example.com'),
('u2', 'Bob Manager', 'MANAGER', 'bob@example.com');

insert into equipment (name, category, barcode, status, location, condition) values
('Sony A7S III', 'Camera', 'CAM-001', 'AVAILABLE', 'Shelf A', 'OK'),
('Canon 24-70mm', 'Lens', 'LENS-001', 'AVAILABLE', 'Shelf B', 'OK');
