-- organizationsテーブルのカラムを確認
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND table_schema = 'public'
ORDER BY ordinal_position;