-- ==========================================
-- Supabase完全セットアップスクリプト
-- 学習管理システム用データベース作成
-- ==========================================

-- UUIDエクステンションを有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. 基本テーブルの作成
-- ==========================================

-- 組織テーブル
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザー（講師・管理者）テーブル
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'teacher' CHECK (role IN ('admin', 'teacher')),
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 生徒テーブル
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 12),
    target_school TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. 拡張テーブルの作成
-- ==========================================

-- 生徒面談テーブル（面談専用）
CREATE TABLE IF NOT EXISTS student_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interview_type TEXT DEFAULT 'regular' CHECK (interview_type IN ('regular', 'parent', 'consultation', 'counseling')),
    interview_date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    topics TEXT[], -- 面談で話したトピック（配列）
    content TEXT NOT NULL, -- 面談内容
    student_condition TEXT, -- 生徒の様子・状態
    parent_feedback TEXT, -- 保護者からのフィードバック（保護者面談の場合）
    action_items TEXT[], -- 今後のアクションアイテム
    next_interview_date DATE, -- 次回面談予定日
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 指導履歴テーブル（授業・指導専用）
CREATE TABLE IF NOT EXISTS teaching_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subject TEXT NOT NULL, -- 科目
    lesson_type TEXT DEFAULT 'individual' CHECK (lesson_type IN ('individual', 'group', 'online', 'review')),
    duration_minutes INTEGER NOT NULL DEFAULT 90,
    curriculum_unit TEXT, -- カリキュラム単元
    materials_used TEXT[], -- 使用教材
    lesson_content TEXT NOT NULL, -- 授業内容
    homework_assigned TEXT, -- 出された宿題
    student_understanding TEXT DEFAULT 'good' CHECK (student_understanding IN ('excellent', 'good', 'fair', 'poor')),
    student_participation TEXT DEFAULT 'active' CHECK (student_participation IN ('very_active', 'active', 'passive', 'reluctant')),
    notes TEXT, -- 指導上の注意点・備考
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 模試結果テーブル（模試専用）
CREATE TABLE IF NOT EXISTS mock_exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_name TEXT NOT NULL, -- 模試名（全統模試、進研模試など）
    exam_date DATE NOT NULL,
    exam_type TEXT DEFAULT 'comprehensive' CHECK (exam_type IN ('comprehensive', 'subject_specific', 'practice')),
    grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 12), -- 学年
    subject TEXT NOT NULL, -- 科目
    total_score INTEGER NOT NULL CHECK (total_score >= 0),
    max_score INTEGER NOT NULL DEFAULT 100,
    percentile_rank DECIMAL(5,2), -- 偏差値
    deviation_value DECIMAL(5,2), -- 偏差値
    rank_in_exam INTEGER, -- 順位
    total_examinees INTEGER, -- 受験者数
    target_score INTEGER, -- 目標点数
    improvement_points TEXT[], -- 改善すべき点
    strong_points TEXT[], -- 良かった点
    analysis_memo TEXT, -- 分析メモ
    next_target TEXT, -- 次回目標
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 模試スケジュールテーブル（予定管理）
CREATE TABLE IF NOT EXISTS mock_exam_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    exam_name TEXT NOT NULL,
    exam_date DATE NOT NULL,
    registration_deadline DATE,
    target_grade_levels INTEGER[], -- 対象学年（配列）
    subjects TEXT[], -- 科目
    fee INTEGER DEFAULT 0, -- 受験料
    venue TEXT, -- 会場
    notes TEXT, -- 備考
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. インデックス作成
-- ==========================================

-- 基本テーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_students_organization_id ON students(organization_id);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);

-- 生徒面談用インデックス
CREATE INDEX IF NOT EXISTS idx_student_interviews_organization_id ON student_interviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_student_interviews_student_id ON student_interviews(student_id);
CREATE INDEX IF NOT EXISTS idx_student_interviews_date ON student_interviews(interview_date);

-- 指導履歴用インデックス
CREATE INDEX IF NOT EXISTS idx_teaching_records_organization_id ON teaching_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_teaching_records_student_id ON teaching_records(student_id);
CREATE INDEX IF NOT EXISTS idx_teaching_records_date ON teaching_records(lesson_date);
CREATE INDEX IF NOT EXISTS idx_teaching_records_subject ON teaching_records(subject);

-- 模試結果用インデックス
CREATE INDEX IF NOT EXISTS idx_mock_exam_results_organization_id ON mock_exam_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_results_student_id ON mock_exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_results_exam_date ON mock_exam_results(exam_date);
CREATE INDEX IF NOT EXISTS idx_mock_exam_results_exam_name ON mock_exam_results(exam_name);

-- 模試スケジュール用インデックス
CREATE INDEX IF NOT EXISTS idx_mock_exam_schedule_organization_id ON mock_exam_schedule(organization_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_schedule_exam_date ON mock_exam_schedule(exam_date);

-- ==========================================
-- 4. Row Level Security (RLS) 設定
-- ==========================================

-- RLSを有効化（基本テーブル）
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- RLSを有効化（拡張テーブル）
ALTER TABLE student_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_schedule ENABLE ROW LEVEL SECURITY;

-- 組織のRLSポリシー
CREATE POLICY "Organizations access" ON organizations
    FOR ALL USING (true); -- 開発中は全アクセス許可

-- ユーザーのRLSポリシー
CREATE POLICY "Users organization access" ON users
    FOR ALL USING (true); -- 開発中は全アクセス許可

-- 生徒のRLSポリシー
CREATE POLICY "Students organization access" ON students
    FOR ALL USING (true); -- 開発中は全アクセス許可

-- 生徒面談のRLSポリシー
CREATE POLICY "Student interviews access" ON student_interviews
    FOR ALL USING (true); -- 開発中は全アクセス許可

-- 指導履歴のRLSポリシー
CREATE POLICY "Teaching records access" ON teaching_records
    FOR ALL USING (true); -- 開発中は全アクセス許可

-- 模試結果のRLSポリシー
CREATE POLICY "Mock exam results access" ON mock_exam_results
    FOR ALL USING (true); -- 開発中は全アクセス許可

-- 模試スケジュールのRLSポリシー
CREATE POLICY "Mock exam schedule access" ON mock_exam_schedule
    FOR ALL USING (true); -- 開発中は全アクセス許可

-- ==========================================
-- 5. サンプルデータ挿入
-- ==========================================

-- 組織データ
INSERT INTO organizations (id, name) VALUES 
('11111111-1111-1111-1111-111111111111', 'サンプル塾')
ON CONFLICT (id) DO NOTHING;

-- ユーザー（講師）データ
INSERT INTO users (id, organization_id, email, name, role, phone) VALUES 
('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'admin@example.com', '田中先生', 'admin', '090-1234-5678'),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'teacher1@example.com', '佐藤先生', 'teacher', '090-2345-6789'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'teacher2@example.com', '鈴木先生', 'teacher', '090-3456-7890')
ON CONFLICT (email) DO NOTHING;

-- 生徒データ
INSERT INTO students (organization_id, name, grade, target_school, parent_name, parent_phone, parent_email) VALUES 
('11111111-1111-1111-1111-111111111111', '田中太郎', 3, '○○大学', '田中父', '090-1111-1111', 'parent1@example.com'),
('11111111-1111-1111-1111-111111111111', '佐藤花子', 2, '△△高校', '佐藤母', '090-2222-2222', 'parent2@example.com'),
('11111111-1111-1111-1111-111111111111', '鈴木次郎', 1, '未定', '鈴木父', '090-3333-3333', 'parent3@example.com'),
('11111111-1111-1111-1111-111111111111', '山田三郎', 3, '◇◇大学', '山田母', '090-4444-4444', 'parent4@example.com'),
('11111111-1111-1111-1111-111111111111', '高橋美咲', 2, '☆☆高校', '高橋父', '090-5555-5555', 'parent5@example.com')
ON CONFLICT DO NOTHING;

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
    (SELECT id FROM students WHERE name = '田中太郎' LIMIT 1),
    '11111111-1111-1111-1111-111111111111',
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
    (SELECT id FROM students WHERE name = '佐藤花子' LIMIT 1),
    '22222222-2222-2222-2222-222222222222',
    'parent',
    CURRENT_DATE - INTERVAL '3 days',
    60,
    ARRAY['進路相談', '家庭学習'],
    '保護者面談。進路について詳しく相談し、志望校を決定。',
    '真面目で努力家。集中力が高い。',
    ARRAY['志望校の過去問演習', '定期的な面談継続']
)
ON CONFLICT DO NOTHING;

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
    student_participation
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM students WHERE name = '田中太郎' LIMIT 1),
    '11111111-1111-1111-1111-111111111111',
    CURRENT_DATE - INTERVAL '2 days',
    '数学',
    'individual',
    90,
    '二次関数',
    ARRAY['教科書', 'プリントA-1'],
    '二次関数のグラフの書き方を復習。頂点と軸の求め方を重点的に指導。',
    'プリントA-2の問題1-10',
    'good',
    'active'
),
(
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM students WHERE name = '佐藤花子' LIMIT 1),
    '22222222-2222-2222-2222-222222222222',
    CURRENT_DATE - INTERVAL '1 day',
    '英語',
    'individual',
    90,
    '現在完了',
    ARRAY['教科書', '文法問題集'],
    '現在完了の基本用法を説明。練習問題を通じて理解を深めた。',
    '文法問題集P.50-55',
    'excellent',
    'very_active'
),
(
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM students WHERE name = '鈴木次郎' LIMIT 1),
    '33333333-3333-3333-3333-333333333333',
    CURRENT_DATE,
    '国語',
    'individual',
    90,
    '古文',
    ARRAY['古文教材', '単語帳'],
    '古文の基礎文法を学習。助動詞の活用を重点的に練習。',
    '古文単語暗記20語',
    'fair',
    'passive'
)
ON CONFLICT DO NOTHING;

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
    (SELECT id FROM students WHERE name = '田中太郎' LIMIT 1),
    '全統高1模試',
    CURRENT_DATE - INTERVAL '14 days',
    'comprehensive',
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
    (SELECT id FROM students WHERE name = '田中太郎' LIMIT 1),
    '全統高1模試',
    CURRENT_DATE - INTERVAL '14 days',
    'comprehensive',
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
    (SELECT id FROM students WHERE name = '佐藤花子' LIMIT 1),
    '進研模試',
    CURRENT_DATE - INTERVAL '10 days',
    'comprehensive',
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
),
(
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM students WHERE name = '鈴木次郎' LIMIT 1),
    '校内実力テスト',
    CURRENT_DATE - INTERVAL '5 days',
    'practice',
    1,
    '国語',
    45,
    100,
    45.0,
    42.3,
    60,
    ARRAY['古文', '漢文', '読解'],
    ARRAY['現代文基礎'],
    '現代文は基礎力があるが、古文・漢文の理解不足。'
)
ON CONFLICT DO NOTHING;

-- ==========================================
-- 6. 更新トリガー関数とトリガーの作成
-- ==========================================

-- updated_at自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにupdated_atトリガーを追加
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_interviews_updated_at BEFORE UPDATE ON student_interviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teaching_records_updated_at BEFORE UPDATE ON teaching_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mock_exam_results_updated_at BEFORE UPDATE ON mock_exam_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mock_exam_schedule_updated_at BEFORE UPDATE ON mock_exam_schedule FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- セットアップ完了メッセージ
-- ==========================================

SELECT 'データベースセットアップが完了しました!' as message; 