-- ==========================================
-- 既存テーブル構造確認クエリ
-- ==========================================

-- 1. studentsテーブルの構造確認
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'students' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. usersテーブルの構造確認  
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. interviewsテーブルの構造確認
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'interviews' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. scoresテーブルの構造確認
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'scores' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. organizationsテーブルの構造確認
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. 外部キー制約の確認
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 7. 各テーブルのサンプルデータ確認
SELECT 'students' as table_name, COUNT(*) as record_count FROM students
UNION ALL
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'interviews' as table_name, COUNT(*) as record_count FROM interviews
UNION ALL
SELECT 'scores' as table_name, COUNT(*) as record_count FROM scores
UNION ALL
SELECT 'organizations' as table_name, COUNT(*) as record_count FROM organizations; 