
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'sms_logs';

SELECT count(*) FROM sms_logs;

SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 5;
