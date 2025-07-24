-- organizationsテーブルの詳細なカラム情報を取得
SELECT 
    column_name as "カラム名", 
    data_type as "データ型", 
    is_nullable as "NULL許可", 
    column_default as "デフォルト値"
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- テーブルが存在するか確認
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
) as "テーブル存在";

-- 全テーブル一覧を確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;