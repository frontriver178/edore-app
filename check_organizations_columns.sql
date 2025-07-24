-- organizationsテーブルのカラム構造を確認
SELECT 
    column_name as "カラム名", 
    data_type as "データ型", 
    is_nullable as "NULL許可", 
    column_default as "デフォルト値"
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND table_schema = 'public'
ORDER BY ordinal_position;