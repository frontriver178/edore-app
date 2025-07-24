-- 生徒データ読み込みパフォーマンスを改善するためのインデックス作成
-- 注意: interview_recordsテーブルが存在しない場合があるため、条件付きで実行

-- 1. students テーブルのインデックス
-- 組織IDとステータスの複合インデックス（最も重要）
CREATE INDEX IF NOT EXISTS idx_students_org_status 
ON students(organization_id, status);

-- グレード（学年）のインデックス
CREATE INDEX IF NOT EXISTS idx_students_grade 
ON students(grade);

-- 組織IDとグレードの複合インデックス（ソート性能向上）
CREATE INDEX IF NOT EXISTS idx_students_org_grade 
ON students(organization_id, grade) 
WHERE status = 'active';

-- 2. users テーブルのインデックス
-- ユーザーIDのインデックス（もし存在しない場合）
CREATE INDEX IF NOT EXISTS idx_users_id 
ON users(id);

-- 組織IDのインデックス
CREATE INDEX IF NOT EXISTS idx_users_organization_id 
ON users(organization_id);

-- 3. teaching_records テーブルのインデックス（存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teaching_records') THEN
        CREATE INDEX IF NOT EXISTS idx_teaching_records_org_student 
        ON teaching_records(organization_id, student_id);
    END IF;
END$$;

-- 4. interview_schedules テーブルのインデックス（interview_recordsの代わりに）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interview_schedules') THEN
        CREATE INDEX IF NOT EXISTS idx_interview_schedules_org_student 
        ON interview_schedules(organization_id, student_id);
    END IF;
END$$;

-- 5. インデックスの統計情報を更新（存在するテーブルのみ）
ANALYZE students;
ANALYZE users;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teaching_records') THEN
        ANALYZE teaching_records;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interview_schedules') THEN
        ANALYZE interview_schedules;
    END IF;
END$$;

-- 6. 現在のインデックスを確認
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM 
    pg_indexes
WHERE 
    tablename IN ('students', 'users', 'teaching_records', 'interview_schedules')
ORDER BY 
    tablename, indexname;