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

After running this migration, the application will automatically store and display this information.
