-- textbooksテーブルの構造を詳細に確認
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'textbooks'
ORDER BY ordinal_position;

-- textbooksテーブルの制約を確認
SELECT 
    conname,
    contype,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'textbooks'::regclass;