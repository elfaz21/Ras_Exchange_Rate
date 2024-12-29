SELECT cron.schedule(
    job_name => 'call edge function',
    schedule => '*/5 * * * *', -- Runs every 5 minutes
    command => $$
    SELECT net.http_post(
        url := 'https://qurekquvkfuesoccxxfm.supabase.co/functions/v1/fetch_exchange_rates',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cmVrcXV2a2Z1ZXNvY2N4eGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzIwMjYwOCwiZXhwIjoyMDQ4Nzc4NjA4fQ.2oKIgkN_jfb75U3TtwPcHckaip91oQHj9XQKtxUPnCI"}'
    );
    $$ 
);