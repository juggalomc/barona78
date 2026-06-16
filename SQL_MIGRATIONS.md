# SQL Migrations

## Tariff Calculation Type Columns

To support the different tariff calculation types (price per m², equal split, and a fixed amount per apartment), the `tariffs` table needs the following columns:

```sql
ALTER TABLE tariffs
ADD COLUMN IF NOT EXISTS is_per_m2 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_equal_split BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_fixed_amount BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS price_per_m2 NUMERIC,
ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC;
```

### Explanation:

- **is_per_m2** (BOOLEAN): Tariff is a fixed price per m² (`price_per_m2`).
- **is_equal_split** (BOOLEAN): Total amount split equally between participating apartments.
- **is_fixed_amount** (BOOLEAN): A fixed amount billed to each apartment (`price_per_unit`).
- **price_per_m2** (NUMERIC): Price per m² when `is_per_m2` is true.
- **price_per_unit** (NUMERIC): Fixed amount per apartment when `is_fixed_amount` is true.

When none of the boolean flags are set, the tariff `total_amount` is split proportionally by area.

# SQL Migrations for Apartment Fields

## Add New Apartment Fields

Run the following SQL statements in your Supabase database to add the new columns to the `apartments` table:

```sql
-- Add registration_number column
ALTER TABLE apartments 
ADD COLUMN registration_number VARCHAR(255);

-- Add apartment_address column
ALTER TABLE apartments 
ADD COLUMN apartment_address TEXT;

-- Add is_residential column (defaults to true)
ALTER TABLE apartments 
ADD COLUMN is_residential BOOLEAN DEFAULT TRUE;
```

### Alternative: Create both columns in one statement

```sql
ALTER TABLE apartments 
ADD COLUMN registration_number VARCHAR(255),
ADD COLUMN apartment_address TEXT;
```

### Explanation:

- **registration_number** (VARCHAR 255): Stores the apartment registration/cadastral number (e.g., "LV05016004137")
- **apartment_address** (TEXT): Stores the full address of the apartment within the building

Both columns are optional (NULL allowed).

### Steps to apply in Supabase:

1. Go to your Supabase project
2. Navigate to SQL Editor
3. Click "New Query"
4. Paste the SQL statement above
5. Click "Run"
6. The columns will be added to the `apartments` table

## Water Consumption Table Setup

To enable synchronization, the `water_consumption` table must have a unique constraint on the combination of apartment, period, and meter type.

If you encounter a "duplicate key value violates unique constraint" error, especially one mentioning `water_consumption_apartment_id_period_key`, it means an incorrect unique constraint might already exist. You should drop it first.

```sql
-- OPTIONAL: Drop an existing incorrect unique constraint if it exists and causes conflicts
-- This is often named 'water_consumption_apartment_id_period_key' if created automatically
-- ALTER TABLE water_consumption
-- DROP CONSTRAINT water_consumption_apartment_id_period_key;

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS water_consumption (
  id BIGSERIAL PRIMARY KEY,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- e.g. '2024-01'
  meter_type VARCHAR(20) NOT NULL, -- 'water' or 'hot_water'
  consumption_m3 DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add the unique constraint required for the UPSERT logic
ALTER TABLE water_consumption
ADD CONSTRAINT water_consumption_unique_entry UNIQUE (apartment_id, period, meter_type);
```
After running this migration, the application will automatically store and display this information.
## Water Consumption Table Setup

To enable synchronization, the `water_consumption` table must have a unique constraint on the combination of apartment, period, and meter type.

```sql
-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS water_consumption (
  id BIGSERIAL PRIMARY KEY,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- e.g. '2024-01'
  meter_type VARCHAR(20) NOT NULL, -- 'water' or 'hot_water'
  consumption_m3 DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add the unique constraint required for the UPSERT logic
ALTER TABLE water_consumption
ADD CONSTRAINT water_consumption_unique_entry UNIQUE (apartment_id, period, meter_type);
```
After running this migration, the application will automatically store and display this information.
