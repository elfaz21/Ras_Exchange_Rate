

-- Enable Row-Level Security for each table
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Policies for service_role on banks table
CREATE POLICY service_role_banks
    ON banks
    FOR ALL
    USING (auth.role() = 'service_role');

-- Policies for service_role on currencies table
CREATE POLICY service_role_currencies
    ON currencies
    FOR ALL
    USING (auth.role() = 'service_role');

-- Policies for service_role on exchange_rates table
CREATE POLICY service_role_exchange_rates
    ON exchange_rates
    FOR ALL
    USING (auth.role() = 'service_role');

-- Public read-only access to banks table
CREATE POLICY public_read_banks
    ON banks
    FOR SELECT
    USING (true);

-- Public read-only access to currencies table
CREATE POLICY public_read_currencies
    ON currencies
    FOR SELECT
    USING (true);

-- Public read-only access to exchange_rates table
CREATE POLICY public_read_exchange_rates
    ON exchange_rates
    FOR SELECT
    USING (true);


    -- Enable RLS for the storage bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow all actions for service_role
CREATE POLICY "Allow all actions for service_role"
ON storage.objects
FOR ALL
USING (auth.role() = 'service_role');

-- Allow read access for public users
CREATE POLICY "Allow read access for public users"
ON storage.objects
FOR SELECT
USING (true);