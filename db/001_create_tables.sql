-- Drop tables if they exist
DROP TABLE IF EXISTS exchange_rates;
DROP TABLE IF EXISTS currencies;
DROP TABLE IF EXISTS banks;

-- Create Banks Table
CREATE TABLE banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR UNIQUE NOT NULL,
    swift_code VARCHAR UNIQUE NOT NULL,  
    country VARCHAR,
    logo_url VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Currencies Table with a flag_url column
CREATE TABLE currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_code VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    flag_url VARCHAR, 
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Exchange Rates Table
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,
    currency_id UUID REFERENCES currencies(id) ON DELETE CASCADE,
    buying_rate DECIMAL NOT NULL CHECK (buying_rate > 0), 
    selling_rate DECIMAL NOT NULL CHECK (selling_rate > 0),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (bank_id, currency_id, date)
);
