-- Wings on Wheels Database Schema
-- Create database: CREATE DATABASE wings_on_wheels_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('CUSTOMER', 'TECHNICIAN', 'MANAGER')),
    scopes JSONB DEFAULT '[]'::jsonb,
    base_salary NUMERIC(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    address TEXT,
    vehicle_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    duration INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spare parts table
CREATE TABLE IF NOT EXISTS spare_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    stock_quantity DECIMAL(10,3) DEFAULT 0,
    min_stock_level DECIMAL(10,3) DEFAULT 5,
    unit VARCHAR(20) DEFAULT 'pieces',
    unit_type VARCHAR(20) DEFAULT 'discrete',
    supplier VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Makes table
CREATE TABLE IF NOT EXISTS vehicle_makes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    logo_url VARCHAR(255),
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Models table
CREATE TABLE IF NOT EXISTS vehicle_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    make_id UUID NOT NULL REFERENCES vehicle_makes(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    year_start INTEGER,
    year_end INTEGER,
    body_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(make_id, name)
);

-- Vehicle Variants table
CREATE TABLE IF NOT EXISTS vehicle_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    variant_code VARCHAR(50),
    engine_type VARCHAR(100),
    engine_capacity VARCHAR(50),
    transmission VARCHAR(50),
    fuel_type VARCHAR(50),
    power_bhp INTEGER,
    torque_nm INTEGER,
    seating_capacity INTEGER,
    fuel_tank_capacity INTEGER,
    ground_clearance INTEGER,
    boot_space INTEGER,
    ecm VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_id, name)
);

-- Vehicle Colors table
CREATE TABLE IF NOT EXISTS vehicle_colors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID NOT NULL REFERENCES vehicle_variants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color_code VARCHAR(20),
    color_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(variant_id, name)
);

-- Customer Vehicles table
CREATE TABLE IF NOT EXISTS customer_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    make_id UUID REFERENCES vehicle_makes(id) ON DELETE SET NULL,
    model_id UUID REFERENCES vehicle_models(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES vehicle_variants(id) ON DELETE SET NULL,
    color_id UUID REFERENCES vehicle_colors(id) ON DELETE SET NULL,
    license_plate VARCHAR(50),
    vin VARCHAR(50),
    year INTEGER,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES customer_vehicles(id) ON DELETE SET NULL,
    service_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PARTIAL', 'PAID')),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bill services table
CREATE TABLE IF NOT EXISTS bill_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bill spare parts table
CREATE TABLE IF NOT EXISTS bill_spare_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    spare_part_id UUID REFERENCES spare_parts(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_technician_id ON bills(technician_id);
CREATE INDEX IF NOT EXISTS idx_bills_vehicle_id ON bills(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bills_service_date ON bills(service_date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bill_services_bill_id ON bill_services(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_spare_parts_bill_id ON bill_spare_parts(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_make_id ON vehicle_models(make_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_variants_model_id ON vehicle_variants(model_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_colors_variant_id ON vehicle_colors(variant_id);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_customer_id ON customer_vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_vin ON customer_vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_license_plate ON customer_vehicles(license_plate);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (drop if exists first)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
DROP TRIGGER IF EXISTS update_spare_parts_updated_at ON spare_parts;
DROP TRIGGER IF EXISTS update_bills_updated_at ON bills;
DROP TRIGGER IF EXISTS update_vehicle_makes_updated_at ON vehicle_makes;
DROP TRIGGER IF EXISTS update_vehicle_models_updated_at ON vehicle_models;
DROP TRIGGER IF EXISTS update_vehicle_variants_updated_at ON vehicle_variants;
DROP TRIGGER IF EXISTS update_vehicle_colors_updated_at ON vehicle_colors;
DROP TRIGGER IF EXISTS update_customer_vehicles_updated_at ON customer_vehicles;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_spare_parts_updated_at BEFORE UPDATE ON spare_parts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_makes_updated_at BEFORE UPDATE ON vehicle_makes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_models_updated_at BEFORE UPDATE ON vehicle_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_variants_updated_at BEFORE UPDATE ON vehicle_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_colors_updated_at BEFORE UPDATE ON vehicle_colors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_vehicles_updated_at BEFORE UPDATE ON customer_vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Job Cards table
CREATE TABLE IF NOT EXISTS job_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_card_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vehicle_id UUID REFERENCES customer_vehicles(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ESTIMATED', 'IN_PROGRESS', 'COMPLETED', 'INVOICED', 'CANCELLED')),
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    odometer_reading INTEGER DEFAULT 0,
    fuel_level VARCHAR(20) DEFAULT '50%',
    customer_complaints TEXT,
    technician_diagnosis TEXT,
    inventory_checklist JSONB DEFAULT '{"spare_wheel": true, "toolkit": true, "jack": true, "stereo": true, "floor_mats": true}'::jsonb,
    visual_inspection_notes TEXT,
    estimated_amount DECIMAL(10,2) DEFAULT 0,
    actual_amount DECIMAL(10,2) DEFAULT 0,
    customer_approved BOOLEAN DEFAULT false,
    customer_approved_at TIMESTAMP,
    expected_delivery_date TIMESTAMP,
    actual_delivery_date TIMESTAMP,
    bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Multi-technician assignment (stored in job card only, NOT carried over to invoice)
CREATE TABLE IF NOT EXISTS job_card_technicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'TECHNICIAN',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_card_id, technician_id)
);

-- Job Card Services / Labor
CREATE TABLE IF NOT EXISTS job_card_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    service_name VARCHAR(255) NOT NULL,
    description TEXT,
    hours_qty DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_extra_work BOOLEAN DEFAULT false,
    technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job Card Spare Parts & Materials
CREATE TABLE IF NOT EXISTS job_card_spare_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    spare_part_id UUID REFERENCES spare_parts(id) ON DELETE SET NULL,
    part_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    description TEXT,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'pieces',
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_extra_work BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'ISSUED', 'INSTALLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_cards_customer_id ON job_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_vehicle_id ON job_cards(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_status ON job_cards(status);
CREATE INDEX IF NOT EXISTS idx_job_cards_bill_id ON job_cards(bill_id);
CREATE INDEX IF NOT EXISTS idx_job_card_technicians_jc_id ON job_card_technicians(job_card_id);
CREATE INDEX IF NOT EXISTS idx_job_card_technicians_tech_id ON job_card_technicians(technician_id);
CREATE INDEX IF NOT EXISTS idx_job_card_services_jc_id ON job_card_services(job_card_id);
CREATE INDEX IF NOT EXISTS idx_job_card_spare_parts_jc_id ON job_card_spare_parts(job_card_id);

DROP TRIGGER IF EXISTS update_job_cards_updated_at ON job_cards;
CREATE TRIGGER update_job_cards_updated_at BEFORE UPDATE ON job_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Garage Expenses & Comprehensive Financial Outflows
CREATE TABLE IF NOT EXISTS garage_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    expense_type VARCHAR(20) NOT NULL DEFAULT 'OPEX',
    amount DECIMAL(12, 2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
    payee_recipient VARCHAR(255),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    invoice_reference VARCHAR(100),
    notes TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency VARCHAR(50),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_garage_expenses_date ON garage_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_garage_expenses_category ON garage_expenses(category);
CREATE INDEX IF NOT EXISTS idx_garage_expenses_type ON garage_expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_garage_expenses_user ON garage_expenses(user_id);

DROP TRIGGER IF EXISTS update_garage_expenses_updated_at ON garage_expenses;
CREATE TRIGGER update_garage_expenses_updated_at BEFORE UPDATE ON garage_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
