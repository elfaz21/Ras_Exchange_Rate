select cron.schedule(
    job_name => 'send_http_post_request',
    schedule => '0 8,12,18 * * *', -- Runs at 8 AM, 12 PM, and 6 PM
    command => $$
    select net.http_post(
        url := '',
        headers := '{"Authorization": "Bearer "}'
    );
    $$ 
);
