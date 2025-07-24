-- ==========================================
-- Edore 完全データベースセットアップ
-- 学習管理システム用データベース作成
-- ==========================================

-- UUIDエクステンションを有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 既存のテーブルを削除（依存関係の順序で削除）
-- ポリシーも一緒に削除される
DROP TABLE IF EXISTS mock_exam_schedule CASCADE;
DROP TABLE IF EXISTS mock_exam_results CASCADE;
DROP TABLE IF EXISTS teaching_records CASCADE;
DROP TABLE IF EXISTS student_interviews CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ==========================================
-- 1. 基本テーブルの作成
-- ==========================================

-- 組織テーブル
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'standard', 'premium')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'canceled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザー（講師・管理者）テーブル
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'teacher' CHECK (role IN ('admin', 'teacher')),
    phone TEXT,
    hire_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 生徒テーブル
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_number TEXT,
    name TEXT NOT NULL,
    grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 12),
    target_school TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 生徒面談テーブル
CREATE TABLE student_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interview_type TEXT DEFAULT 'regular' CHECK (interview_type IN ('regular', 'parent', 'consultation', 'counseling')),
    interview_date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    topics TEXT[],
    content TEXT NOT NULL,
    student_condition TEXT,
    parent_feedback TEXT,
    action_items TEXT[],
    next_interview_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 指導履歴テーブル
CREATE TABLE teaching_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subject TEXT NOT NULL,
    lesson_type TEXT DEFAULT 'individual' CHECK (lesson_type IN ('individual', 'group', 'online', 'review')),
    duration_minutes INTEGER NOT NULL DEFAULT 90,
    curriculum_unit TEXT,
    materials_used TEXT[],
    lesson_content TEXT NOT NULL,
    homework_assigned TEXT,
    student_understanding TEXT DEFAULT 'good' CHECK (student_understanding IN ('excellent', 'good', 'fair', 'poor')),
    student_participation TEXT DEFAULT 'active' CHECK (student_participation IN ('very_active', 'active', 'passive', 'reluctant')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 模試結果テーブル
CREATE TABLE mock_exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_name TEXT NOT NULL,
    exam_date DATE NOT NULL,
    exam_type TEXT DEFAULT 'comprehensive' CHECK (exam_type IN ('comprehensive', 'subject', 'practice')),
    grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 12),
    subject TEXT NOT NULL,
    total_score INTEGER NOT NULL DEFAULT 0 CHECK (total_score >= 0),
    max_score INTEGER NOT NULL DEFAULT 100,
    percentile_rank DECIMAL(5,2),
    deviation_value DECIMAL(5,2),
    rank_in_exam INTEGER,
    total_examinees INTEGER,
    target_score INTEGER,
    improvement_points TEXT[],
    strong_points TEXT[],
    analysis_memo TEXT,
    next_target TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 模試スケジュールテーブル
CREATE TABLE mock_exam_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    exam_name TEXT NOT NULL,
    exam_date DATE NOT NULL,
    registration_deadline DATE,
    target_grade_levels INTEGER[],
    subjects TEXT[],
    fee INTEGER DEFAULT 0,
    venue TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. インデックス作成
-- ==========================================

-- 基本テーブル用インデックス
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_students_organization_id ON students(organization_id);
CREATE INDEX idx_students_grade ON students(grade);
CREATE INDEX idx_students_status ON students(status);

-- 生徒面談用インデックス
CREATE INDEX idx_student_interviews_organization_id ON student_interviews(organization_id);
CREATE INDEX idx_student_interviews_student_id ON student_interviews(student_id);
CREATE INDEX idx_student_interviews_date ON student_interviews(interview_date);

-- 指導履歴用インデックス
CREATE INDEX idx_teaching_records_organization_id ON teaching_records(organization_id);
CREATE INDEX idx_teaching_records_student_id ON teaching_records(student_id);
CREATE INDEX idx_teaching_records_date ON teaching_records(lesson_date);
CREATE INDEX idx_teaching_records_subject ON teaching_records(subject);

-- 模試結果用インデックス
CREATE INDEX idx_mock_exam_results_organization_id ON mock_exam_results(organization_id);
CREATE INDEX idx_mock_exam_results_student_id ON mock_exam_results(student_id);
CREATE INDEX idx_mock_exam_results_exam_date ON mock_exam_results(exam_date);
CREATE INDEX idx_mock_exam_results_exam_name ON mock_exam_results(exam_name);

-- 模試スケジュール用インデックス
CREATE INDEX idx_mock_exam_schedule_organization_id ON mock_exam_schedule(organization_id);
CREATE INDEX idx_mock_exam_schedule_exam_date ON mock_exam_schedule(exam_date);

-- ==========================================
-- 3. Row Level Security (RLS) 設定
-- ==========================================

-- RLSを有効化
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_schedule ENABLE ROW LEVEL SECURITY;

-- 開発環境用の緩いRLSポリシー（全アクセス許可）
CREATE POLICY "Allow all for development" ON organizations FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON students FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON student_interviews FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON teaching_records FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON mock_exam_results FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON mock_exam_schedule FOR ALL USING (true);

-- ==========================================
-- 4. サンプルデータ挿入
-- ==========================================

-- 組織データ
INSERT INTO organizations (id, name, email, phone, address) VALUES 
('11111111-1111-1111-1111-111111111111', 'テスト塾', 'test@example.com', '03-1234-5678', '東京都新宿区1-1-1');

-- ユーザー（講師）データ
INSERT INTO users (id, organization_id, email, name, role, phone) VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@example.com', '田中先生', 'admin', '090-1234-5678'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'teacher1@example.com', '佐藤先生', 'teacher', '090-2345-6789'),
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'teacher2@example.com', '鈴木先生', 'teacher', '090-3456-7890');

-- 生徒データ
INSERT INTO students (id, organization_id, name, grade, target_school, parent_name, parent_phone, parent_email) VALUES 
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '田中太郎', 3, '○○大学', '田中父', '090-1111-1111', 'parent1@example.com'),
('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '佐藤花子', 2, '△△高校', '佐藤母', '090-2222-2222', 'parent2@example.com'),
('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '鈴木次郎', 1, '未定', '鈴木父', '090-3333-3333', 'parent3@example.com'),
('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '山田三郎', 3, '◇◇大学', '山田母', '090-4444-4444', 'parent4@example.com'),
('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '高橋美咲', 2, '☆☆高校', '高橋父', '090-5555-5555', 'parent5@example.com');

-- 生徒面談データ
INSERT INTO student_interviews (
    organization_id, 
    student_id, 
    teacher_id, 
    interview_type,
    interview_date,
    duration_minutes,
    topics,
    content,
    student_condition,
    action_items
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    'regular',
    CURRENT_DATE - INTERVAL '7 days',
    45,
    ARRAY['学習状況', '進路相談'],
    '数学の成績向上について相談。基礎固めを重点的に行う方針で合意。',
    '積極的で意欲的。ただし基礎計算でミスが多い。',
    ARRAY['基礎計算練習を毎日30分', '次回模試への対策']
),
(
    '11111111-1111-1111-1111-111111111111',
    '66666666-6666-6666-6666-666666666666',
    '33333333-3333-3333-3333-333333333333',
    'parent',
    CURRENT_DATE - INTERVAL '3 days',
    60,
    ARRAY['進路相談', '家庭学習'],
    '保護者面談。進路について詳しく相談し、志望校を決定。',
    '真面目で努力家。集中力が高い。',
    ARRAY['志望校の過去問演習', '定期的な面談継続']
);

-- 指導履歴データ
INSERT INTO teaching_records (
    organization_id,
    student_id,
    teacher_id,
    lesson_date,
    subject,
    lesson_type,
    duration_minutes,
    curriculum_unit,
    materials_used,
    lesson_content,
    homework_assigned,
    student_understanding,
    student_participation,
    notes
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    CURRENT_DATE - INTERVAL '2 days',
    '数学',
    'individual',
    90,
    '二次関数',
    ARRAY['教科書', 'プリントA-1'],
    '二次関数のグラフの書き方を復習。頂点と軸の求め方を重点的に指導。',
    'プリントA-2の問題1-10',
    'good',
    'active',
    '基礎は理解しているが、応用問題で躓く'
),
(
    '11111111-1111-1111-1111-111111111111',
    '66666666-6666-6666-6666-666666666666',
    '33333333-3333-3333-3333-333333333333',
    CURRENT_DATE - INTERVAL '1 day',
    '英語',
    'individual',
    90,
    '現在完了',
    ARRAY['教科書', '文法問題集'],
    '現在完了の基本用法を説明。練習問題を通じて理解を深めた。',
    '文法問題集P.50-55',
    'excellent',
    'very_active',
    '理解力が高く、積極的に質問する'
);

-- 模試結果データ
INSERT INTO mock_exam_results (
    organization_id,
    student_id,
    exam_name,
    exam_date,
    exam_type,
    grade_level,
    subject,
    total_score,
    max_score,
    percentile_rank,
    deviation_value,
    target_score,
    improvement_points,
    strong_points,
    analysis_memo
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    '全統高1模試',
    CURRENT_DATE - INTERVAL '14 days',
    'comprehensive',
    3,
    '総合',
    720,
    1000,
    65.5,
    58.2,
    800,
    ARRAY['基礎計算力', '応用問題への取り組み'],
    ARRAY['グラフ問題', '基本公式の理解'],
    '基礎は理解しているが、計算ミスが目立つ。時間配分も要改善。'
),
(
    '11111111-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    '全統高1模試',
    CURRENT_DATE - INTERVAL '14 days',
    'subject',
    3,
    '数学',
    72,
    100,
    65.5,
    58.2,
    80,
    ARRAY['基礎計算力', '応用問題への取り組み'],
    ARRAY['グラフ問題', '基本公式の理解'],
    '基礎は理解しているが、計算ミスが目立つ。時間配分も要改善。'
),
(
    '11111111-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    '全統高1模試',
    CURRENT_DATE - INTERVAL '14 days',
    'subject',
    3,
    '英語',
    68,
    100,
    62.0,
    55.8,
    75,
    ARRAY['長文読解', '文法問題'],
    ARRAY['単語力', '基礎文法'],
    '単語力は十分だが、長文読解で時間不足。'
),
(
    '11111111-1111-1111-1111-111111111111',
    '66666666-6666-6666-6666-666666666666',
    '進研模試',
    CURRENT_DATE - INTERVAL '10 days',
    'subject',
    2,
    '英語',
    85,
    100,
    75.2,
    68.5,
    90,
    ARRAY['リスニング', '作文'],
    ARRAY['文法', '読解'],
    '文法・読解は得意。リスニングの強化が必要。'
);

-- ==========================================
-- 5. 更新トリガー関数とトリガーの作成
-- ==========================================

-- updated_at自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 各テーブルにupdated_atトリガーを追加
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at 
    BEFORE UPDATE ON students 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_interviews_updated_at 
    BEFORE UPDATE ON student_interviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teaching_records_updated_at 
    BEFORE UPDATE ON teaching_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mock_exam_results_updated_at 
    BEFORE UPDATE ON mock_exam_results 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mock_exam_schedule_updated_at 
    BEFORE UPDATE ON mock_exam_schedule 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 6. データベース統計情報の表示
-- ==========================================

-- 作成されたテーブルの確認
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'users', 'students', 'student_interviews', 'teaching_records', 'mock_exam_results', 'mock_exam_schedule')
ORDER BY tablename;

-- 各テーブルのレコード数を表示
SELECT 
    'organizations' as table_name, 
    COUNT(*) as record_count 
FROM organizations
UNION ALL
SELECT 
    'users' as table_name, 
    COUNT(*) as record_count 
FROM users
UNION ALL
SELECT 
    'students' as table_name, 
    COUNT(*) as record_count 
FROM students
UNION ALL
SELECT 
    'student_interviews' as table_name, 
    COUNT(*) as record_count 
FROM student_interviews
UNION ALL
SELECT 
    'teaching_records' as table_name, 
    COUNT(*) as record_count 
FROM teaching_records
UNION ALL
SELECT 
    'mock_exam_results' as table_name, 
    COUNT(*) as record_count 
FROM mock_exam_results
UNION ALL
SELECT 
    'mock_exam_schedule' as table_name, 
    COUNT(*) as record_count 
FROM mock_exam_schedule
ORDER BY table_name;

-- セットアップ完了メッセージ
SELECT 
    '✅ データベースセットアップが完了しました!' as message,
    NOW() as completed_at;

-- 使用方法の説明
SELECT 
    '📋 次の手順' as step,
    '1. Reactアプリケーションを起動: npm start' as instruction
UNION ALL
SELECT 
    '📋 次の手順' as step,
    '2. ブラウザで http://localhost:3000 にアクセス' as instruction
UNION ALL
SELECT 
    '📋 次の手順' as step,
    '3. デバッグパネルでデータベース接続を確認' as instruction
ORDER BY step, instruction; 