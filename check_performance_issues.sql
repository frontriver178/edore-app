-- 生徒データ読み込みパフォーマンス問題の調査

-- 1. students テーブルのインデックスを確認
SELECT 
    indexname,
    tablename,
    indexdef
FROM 
    pg_indexes
WHERE 
    tablename = 'students'
ORDER BY 
    tablename, indexname;

-- 2. students テーブルの行数を確認
SELECT COUNT(*) as total_students FROM students;
SELECT COUNT(*) as active_students FROM students WHERE status = 'active';

-- 3. 組織ごとの生徒数を確認
SELECT 
    organization_id,
    COUNT(*) as student_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
FROM 
    students
GROUP BY 
    organization_id
ORDER BY 
    student_count DESC;

-- 4. クエリ実行計画を確認（StudentList.jsxで使用されているクエリ）
EXPLAIN ANALYZE
SELECT * 
FROM students
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
  AND status = 'active'
ORDER BY grade ASC;

-- 5. usersテーブルのインデックスを確認（AuthContextで使用）
SELECT 
    indexname,
    tablename,
    indexdef
FROM 
    pg_indexes
WHERE 
    tablename = 'users'
ORDER BY 
    tablename, indexname;

-- 6. RLSポリシーの確認
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    tablename IN ('students', 'users')
ORDER BY 
    tablename, policyname;

-- 7. 推奨インデックスの作成（必要に応じて実行）
-- CREATE INDEX IF NOT EXISTS idx_students_org_status ON students(organization_id, status);
-- CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);
-- CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
-- CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);