select cron.schedule(
    job_name => 'send_http_post_request',
    schedule => '0 8,12,18 * * *', -- Runs at 8 AM, 12 PM, and 6 PM
    command => $$
    select net.http_post(
        url := 'https://emgutlzzkkgoyvmcodvc.supabase.co/functions/v1/insertSampleData',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZ3V0bHp6a2tnb3l2bWNvZHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4MjA3NDUsImV4cCI6MjA0NzM5Njc0NX0.Qa-R79wbqROfDtq5PjSUSNsENMDxcMjU2uRiroiyLWE"}'
    );
    $$ 
);
