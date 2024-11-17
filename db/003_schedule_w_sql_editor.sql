
CREATE OR REPLACE FUNCTION fetch_exchange_rates()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    response json;
    bank_record jsonb;
    bank_id uuid;
    currency_record jsonb;
    currency_code text;
    currency_id uuid;  
    buying_rate numeric;
    selling_rate numeric;
BEGIN
    -- Make an HTTP GET request to an external API
    SELECT * INTO response
    FROM http_request('GET', 'apiUrl');

    -- Loop through each bank's exchange rates
    FOR bank_record IN
        SELECT * FROM jsonb_array_elements(response->'data')
    LOOP
        -- Get bank_id by matching the bank_code from the API response
        SELECT id INTO bank_id
        FROM banks
        WHERE bank_code = bank_record->>'bank_code';

        -- If bank doesn't exist, skip this record
        IF NOT FOUND THEN
            RAISE NOTICE 'Bank with code % not found, skipping.', bank_record->>'bank_code';
            CONTINUE;
        END IF;

        -- Loop through each currency for the current bank
        FOR currency_record IN
            SELECT * FROM jsonb_each_text(bank_record->'rates') 
        LOOP
            currency_code := currency_record.key; 
            buying_rate := (currency_record.value->>'buying_rate')::numeric;
            selling_rate := (currency_record.value->>'selling_rate')::numeric;

            -- Fetch the currency_id by matching the currency_code from the API response
            SELECT id INTO currency_id
            FROM currencies
            WHERE currency_code = currency_code;

            -- If currency doesn't exist, skip this record
            IF NOT FOUND THEN
                RAISE NOTICE 'Currency with code % not found, skipping.', currency_code;
                CONTINUE;
            END IF;

            -- Insert the exchange rate into the exchange_rates table
            INSERT INTO exchange_rates (bank_id, currency_id, buying_rate, selling_rate)
            VALUES (bank_id, currency_id, buying_rate, selling_rate);
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Exchange rates fetched and stored successfully.';
END;
$$;


SELECT cron.schedule('fetch_exchange_rates_job', '0 8,12,18 * * *', 'SELECT fetch_exchange_rates();');