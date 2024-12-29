DROP TABLE IF EXISTS exchange_rates;
DROP TABLE IF EXISTS currencies;
DROP TABLE IF EXISTS banks;

-- Create the banks table 
CREATE TABLE banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ethio_banks VARCHAR(255) UNIQUE NOT NULL,
    bank_name VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    data_fetched_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- Create the currencies table 
CREATE TABLE currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_code VARCHAR(10) UNIQUE NOT NULL,
    flag_url TEXT,
    data_fetched_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- Create the exchange_rates table with UUID and timestamps
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,
    currency_id UUID REFERENCES currencies(id) ON DELETE CASCADE,
    buying_rate DECIMAL(10, 2) NOT NULL CHECK (buying_rate > 0), 
    selling_rate DECIMAL(10, 2) NOT NULL CHECK (selling_rate > 0),
    data_fetched_date DATE NOT NULL,
    last_updated TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    UNIQUE (bank_id, currency_id, data_fetched_date) 
);



-- For the banks table
CREATE INDEX idx_banks_ethio_banks ON banks (ethio_banks);

-- For the currencies table
CREATE INDEX idx_currencies_currency_code ON currencies (currency_code);

-- For the exchange_rates table
CREATE INDEX idx_exchange_rates_bank_id ON exchange_rates (bank_id);
CREATE INDEX idx_exchange_rates_currency_id ON exchange_rates (currency_id);
CREATE INDEX idx_exchange_rates_data_fetched_date ON exchange_rates (data_fetched_date);




-- Drop existing triggers
DROP TRIGGER IF EXISTS banks_set_timestamps ON banks;
DROP TRIGGER IF EXISTS currencies_set_timestamps ON currencies;
DROP TRIGGER IF EXISTS exchange_rates_set_timestamps ON exchange_rates;
DROP FUNCTION IF EXISTS set_timestamps();

-- Create the new function
CREATE OR REPLACE FUNCTION set_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_at = NOW();
        NEW.updated_at = NOW();
        NEW.data_fetched_date = CURRENT_DATE;
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
        NEW.data_fetched_date = CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;





-- Create triggers for banks table
CREATE TRIGGER banks_set_timestamps
BEFORE INSERT OR UPDATE ON banks
FOR EACH ROW
EXECUTE FUNCTION set_timestamps();

-- Create triggers for currencies table
CREATE TRIGGER currencies_set_timestamps
BEFORE INSERT OR UPDATE ON currencies
FOR EACH ROW
EXECUTE FUNCTION set_timestamps();

-- Create triggers for exchange_rates table
CREATE TRIGGER exchange_rates_set_timestamps
BEFORE INSERT OR UPDATE ON exchange_rates
FOR EACH ROW
EXECUTE FUNCTION set_timestamps();