-- 既存のカリキュラム関連テーブルの構造を確認

-- テーブルの存在確認
SELECT 
    tablename,
    CASE 
        WHEN tablename IN ('textbook_routes', 'textbooks', 'student_levels', 'study_plans', 'study_tasks') 
        THEN '存在します'
        ELSE '存在しません'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('textbook_routes', 'textbooks', 'student_levels', 'study_plans', 'study_tasks');

-- textbooksテーブルの構造を確認
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

-- 既存のRLSポリシーを確認
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('textbook_routes', 'textbooks', 'student_levels', 'study_plans', 'study_tasks')
ORDER BY tablename, policyname;