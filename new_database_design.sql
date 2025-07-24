-- ==========================================
-- Edore 新データベース設計
-- 学習管理システム（要件定義刷新版）
-- ==========================================

-- UUIDエクステンションを有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 既存のテーブルを削除（依存関係の順序で削除）
DROP TABLE IF EXISTS progress_tracking CASCADE;
DROP TABLE IF EXISTS learning_objectives CASCADE;
DROP TABLE IF EXISTS student_tasks CASCADE;
DROP TABLE IF EXISTS task_categories CASCADE;
DROP TABLE IF EXISTS interview_schedules CASCADE;
DROP TABLE IF EXISTS mock_exam_schedule CASCADE;
DROP TABLE IF EXISTS mock_exam_results CASCADE;
DROP TABLE IF EXISTS teaching_records CASCADE;
DROP TABLE IF EXISTS student_interviews CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ==========================================
-- 1. 基本テーブル（認証・組織系）
-- ==========================================

-- 組織テーブル（塾）
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_email TEXT, -- 代表連絡先のみ
    subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'standard', 'premium')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'canceled')),
    max_students INTEGER DEFAULT 50, -- プラン別の上限
    max_teachers INTEGER DEFAULT 10,
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
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 生徒テーブル（プライバシー重視・最小限の情報）
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 12),
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
    -- 緊急時連絡先（最小限）
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    -- 学習関連情報
    target_school TEXT,
    learning_style TEXT, -- 学習スタイル（視覚的、聴覚的、体験的等）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. タスク管理系テーブル
-- ==========================================

-- タスクカテゴリテーブル
CREATE TABLE task_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#2563eb', -- UI表示用の色
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 生徒タスクテーブル
CREATE TABLE student_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date DATE,
    estimated_hours DECIMAL(4,2),
    actual_hours DECIMAL(4,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    completion_date TIMESTAMP WITH TIME ZONE,
    feedback TEXT, -- 完了時の講師フィードバック
    student_notes TEXT, -- 生徒の学習メモ（将来的）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. スケジュール管理系テーブル
-- ==========================================

-- 面談スケジュールテーブル
CREATE TABLE interview_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    interview_type TEXT DEFAULT 'regular' CHECK (interview_type IN ('regular', 'parent', 'consultation', 'emergency')),
    location TEXT DEFAULT 'classroom',
    purpose TEXT NOT NULL, -- 面談の目的
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    reminder_sent BOOLEAN DEFAULT false,
    notes TEXT, -- 事前準備メモ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 面談記録テーブル（従来の student_interviews を改良）
CREATE TABLE student_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES interview_schedules(id) ON DELETE SET NULL,
    interview_date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    interview_type TEXT DEFAULT 'regular' CHECK (interview_type IN ('regular', 'parent', 'consultation', 'emergency')),
    -- 面談内容
    topics TEXT[] NOT NULL, -- 面談で話し合ったトピック
    content TEXT NOT NULL, -- 面談の詳細内容
    student_condition TEXT, -- 生徒の状態・様子
    achievements TEXT[], -- 達成できたこと
    challenges TEXT[], -- 課題・困っていること
    action_items TEXT[], -- 具体的なアクションアイテム
    next_goals TEXT[], -- 次の目標
    follow_up_date DATE, -- フォローアップ予定日
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. 学習目標・進捗管理系テーブル
-- ==========================================

-- 学習目標テーブル
CREATE TABLE learning_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    target_date DATE NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    category TEXT DEFAULT 'academic' CHECK (category IN ('academic', 'skill', 'behavior', 'exam')),
    success_criteria TEXT NOT NULL, -- 達成基準
    current_status TEXT DEFAULT 'not_started' CHECK (current_status IN ('not_started', 'in_progress', 'achieved', 'missed')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 進捗追跡テーブル
CREATE TABLE progress_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    objective_id UUID REFERENCES learning_objectives(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    progress_percentage INTEGER NOT NULL CHECK (progress_percentage BETWEEN 0 AND 100),
    milestone TEXT, -- 達成したマイルストーン
    observations TEXT, -- 講師の観察記録
    student_feedback TEXT, -- 生徒からのフィードバック
    next_steps TEXT, -- 次のステップ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. 指導記録テーブル（改良版）
-- ==========================================

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
    
    -- 指導内容
    curriculum_unit TEXT,
    lesson_objectives TEXT[], -- 授業の目標
    materials_used TEXT[],
    lesson_content TEXT NOT NULL,
    
    -- 宿題・課題
    homework_assigned TEXT,
    homework_due_date DATE,
    
    -- 評価
    student_understanding TEXT DEFAULT 'good' CHECK (student_understanding IN ('excellent', 'good', 'fair', 'poor')),
    student_participation TEXT DEFAULT 'active' CHECK (student_participation IN ('very_active', 'active', 'passive', 'reluctant')),
    
    -- 改善点
    achievements TEXT[], -- この授業で達成できたこと
    areas_for_improvement TEXT[], -- 改善が必要な点
    next_lesson_focus TEXT, -- 次回の授業の重点
    
    -- メモ
    teacher_notes TEXT,
    student_questions TEXT[], -- 生徒からの質問
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 6. 模試・評価系テーブル
-- ==========================================

-- 模試結果テーブル
CREATE TABLE mock_exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_name TEXT NOT NULL,
    exam_date DATE NOT NULL,
    exam_type TEXT DEFAULT 'comprehensive' CHECK (exam_type IN ('comprehensive', 'subject', 'practice')),
    subject TEXT NOT NULL,
    
    -- 成績情報
    total_score INTEGER NOT NULL DEFAULT 0 CHECK (total_score >= 0),
    max_score INTEGER NOT NULL DEFAULT 100,
    percentile_rank DECIMAL(5,2),
    deviation_value DECIMAL(5,2),
    
    -- 分析
    strong_areas TEXT[], -- 得意分野
    weak_areas TEXT[], -- 苦手分野
    improvement_recommendations TEXT[], -- 改善提案
    
    -- 目標設定
    previous_score INTEGER, -- 前回の点数
    target_score INTEGER, -- 目標点数
    score_improvement INTEGER, -- 点数向上
    
    -- メモ
    analysis_notes TEXT,
    next_exam_goals TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 7. インデックス作成
-- ==========================================

-- 基本テーブル用インデックス
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_students_organization_id ON students(organization_id);
CREATE INDEX idx_students_grade ON students(grade);
CREATE INDEX idx_students_status ON students(status);

-- タスク管理用インデックス
CREATE INDEX idx_task_categories_organization_id ON task_categories(organization_id);
CREATE INDEX idx_student_tasks_organization_id ON student_tasks(organization_id);
CREATE INDEX idx_student_tasks_student_id ON student_tasks(student_id);
CREATE INDEX idx_student_tasks_due_date ON student_tasks(due_date);
CREATE INDEX idx_student_tasks_status ON student_tasks(status);

-- スケジュール管理用インデックス
CREATE INDEX idx_interview_schedules_organization_id ON interview_schedules(organization_id);
CREATE INDEX idx_interview_schedules_student_id ON interview_schedules(student_id);
CREATE INDEX idx_interview_schedules_teacher_id ON interview_schedules(teacher_id);
CREATE INDEX idx_interview_schedules_date ON interview_schedules(scheduled_date);
CREATE INDEX idx_interview_schedules_status ON interview_schedules(status);

-- 面談記録用インデックス
CREATE INDEX idx_student_interviews_organization_id ON student_interviews(organization_id);
CREATE INDEX idx_student_interviews_student_id ON student_interviews(student_id);
CREATE INDEX idx_student_interviews_date ON student_interviews(interview_date);

-- 学習目標・進捗用インデックス
CREATE INDEX idx_learning_objectives_organization_id ON learning_objectives(organization_id);
CREATE INDEX idx_learning_objectives_student_id ON learning_objectives(student_id);
CREATE INDEX idx_learning_objectives_target_date ON learning_objectives(target_date);
CREATE INDEX idx_progress_tracking_organization_id ON progress_tracking(organization_id);
CREATE INDEX idx_progress_tracking_student_id ON progress_tracking(student_id);
CREATE INDEX idx_progress_tracking_date ON progress_tracking(tracking_date);

-- 指導履歴用インデックス
CREATE INDEX idx_teaching_records_organization_id ON teaching_records(organization_id);
CREATE INDEX idx_teaching_records_student_id ON teaching_records(student_id);
CREATE INDEX idx_teaching_records_date ON teaching_records(lesson_date);
CREATE INDEX idx_teaching_records_subject ON teaching_records(subject);

-- 模試結果用インデックス
CREATE INDEX idx_mock_exam_results_organization_id ON mock_exam_results(organization_id);
CREATE INDEX idx_mock_exam_results_student_id ON mock_exam_results(student_id);
CREATE INDEX idx_mock_exam_results_exam_date ON mock_exam_results(exam_date);

-- ==========================================
-- 8. Row Level Security (RLS) 設定
-- ==========================================

-- RLSを有効化
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_results ENABLE ROW LEVEL SECURITY;

-- 開発環境用の緩いRLSポリシー（全アクセス許可）
-- 本番環境では組織別のアクセス制御を実装
CREATE POLICY "Allow all for development" ON organizations FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON students FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON task_categories FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON student_tasks FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON interview_schedules FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON student_interviews FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON learning_objectives FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON progress_tracking FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON teaching_records FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON mock_exam_results FOR ALL USING (true);

-- ==========================================
-- 9. 更新トリガー関数とトリガーの作成
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

CREATE TRIGGER update_student_tasks_updated_at 
    BEFORE UPDATE ON student_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_schedules_updated_at 
    BEFORE UPDATE ON interview_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_interviews_updated_at 
    BEFORE UPDATE ON student_interviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_objectives_updated_at 
    BEFORE UPDATE ON learning_objectives 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teaching_records_updated_at 
    BEFORE UPDATE ON teaching_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mock_exam_results_updated_at 
    BEFORE UPDATE ON mock_exam_results 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 10. 便利なビュー（仮想テーブル）の作成
-- ==========================================

-- 生徒の学習状況サマリービュー
CREATE VIEW student_summary AS
SELECT 
    s.id as student_id,
    s.name as student_name,
    s.grade,
    s.status,
    s.organization_id,
    
    -- タスク統計
    COUNT(DISTINCT st.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN st.status = 'completed' THEN st.id END) as completed_tasks,
    COUNT(DISTINCT CASE WHEN st.status = 'pending' AND st.due_date < CURRENT_DATE THEN st.id END) as overdue_tasks,
    
    -- 面談統計
    COUNT(DISTINCT si.id) as total_interviews,
    MAX(si.interview_date) as last_interview_date,
    
    -- 指導統計
    COUNT(DISTINCT tr.id) as total_lessons,
    MAX(tr.lesson_date) as last_lesson_date,
    
    -- 目標統計
    COUNT(DISTINCT lo.id) as total_objectives,
    COUNT(DISTINCT CASE WHEN lo.current_status = 'achieved' THEN lo.id END) as achieved_objectives,
    
    -- 模試統計
    COUNT(DISTINCT mer.id) as total_mock_exams,
    MAX(mer.exam_date) as last_exam_date

FROM students s
LEFT JOIN student_tasks st ON s.id = st.student_id
LEFT JOIN student_interviews si ON s.id = si.student_id
LEFT JOIN teaching_records tr ON s.id = tr.student_id
LEFT JOIN learning_objectives lo ON s.id = lo.student_id
LEFT JOIN mock_exam_results mer ON s.id = mer.student_id
GROUP BY s.id, s.name, s.grade, s.status, s.organization_id;

-- 講師の担当生徒サマリービュー
CREATE VIEW teacher_workload AS
SELECT 
    u.id as teacher_id,
    u.name as teacher_name,
    u.organization_id,
    
    -- 担当生徒数
    COUNT(DISTINCT tr.student_id) as students_count,
    
    -- 今週の予定
    COUNT(DISTINCT CASE WHEN isch.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 THEN isch.id END) as upcoming_interviews,
    
    -- 未完了タスク
    COUNT(DISTINCT CASE WHEN st.status IN ('pending', 'in_progress') THEN st.id END) as pending_tasks,
    
    -- 今月の指導回数
    COUNT(DISTINCT CASE WHEN tr.lesson_date >= DATE_TRUNC('month', CURRENT_DATE) THEN tr.id END) as lessons_this_month

FROM users u
LEFT JOIN teaching_records tr ON u.id = tr.teacher_id
LEFT JOIN interview_schedules isch ON u.id = isch.teacher_id
LEFT JOIN student_tasks st ON u.id = st.teacher_id
WHERE u.role = 'teacher' AND u.is_active = true
GROUP BY u.id, u.name, u.organization_id;

-- ==========================================
-- 11. サンプルデータ挿入
-- ==========================================

-- 組織データ
INSERT INTO organizations (id, name, contact_email, max_students, max_teachers) VALUES 
('11111111-1111-1111-1111-111111111111', 'テスト進学塾', 'info@test-juku.com', 50, 10);

-- ユーザー（講師）データ
INSERT INTO users (id, organization_id, email, name, role) VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@test-juku.com', '田中塾長', 'admin'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'sato@test-juku.com', '佐藤先生', 'teacher'),
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'suzuki@test-juku.com', '鈴木先生', 'teacher');

-- 生徒データ（プライバシー重視）
INSERT INTO students (id, organization_id, name, grade, target_school, emergency_contact_name, emergency_contact_phone, learning_style) VALUES 
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '田中太郎', 3, '○○大学', '田中父', '090-1111-1111', '視覚的'),
('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '佐藤花子', 2, '△△高校', '佐藤母', '090-2222-2222', '聴覚的'),
('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '鈴木次郎', 1, '未定', '鈴木父', '090-3333-3333', '体験的');

-- タスクカテゴリデータ
INSERT INTO task_categories (id, organization_id, name, description, color) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '宿題', '日常的な宿題', '#3b82f6'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '復習', '授業の復習', '#10b981'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '試験対策', '定期試験・模試対策', '#f59e0b'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '弱点克服', '苦手分野の克服', '#ef4444');

-- 生徒タスクデータ
INSERT INTO student_tasks (
    organization_id, student_id, teacher_id, category_id, title, description, priority, due_date, estimated_hours, status
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    '33333333-3333-3333-3333-333333333333',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '数学 問題集P.50-60',
    '二次関数の応用問題を解く',
    'high',
    CURRENT_DATE + 3,
    2.0,
    'pending'
),
(
    '11111111-1111-1111-1111-111111111111',
    '66666666-6666-6666-6666-666666666666',
    '44444444-4444-4444-4444-444444444444',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '英語 単語暗記',
    'Unit 5の単語50個を覚える',
    'medium',
    CURRENT_DATE + 5,
    1.5,
    'in_progress'
);

-- 面談スケジュールデータ
INSERT INTO interview_schedules (
    organization_id, student_id, teacher_id, scheduled_date, scheduled_time, duration_minutes,
    interview_type, purpose, status
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    '33333333-3333-3333-3333-333333333333',
    CURRENT_DATE + 2,
    '14:00',
    45,
    'regular',
    '数学の成績向上について相談',
    'scheduled'
),
(
    '11111111-1111-1111-1111-111111111111',
    '66666666-6666-6666-6666-666666666666',
    '44444444-4444-4444-4444-444444444444',
    CURRENT_DATE + 5,
    '16:00',
    30,
    'parent',
    '進路相談（保護者同席）',
    'scheduled'
);

-- 学習目標データ
INSERT INTO learning_objectives (
    organization_id, student_id, teacher_id, title, description, subject, target_date,
    priority, category, success_criteria, current_status, progress_percentage
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    '33333333-3333-3333-3333-333333333333',
    '数学の基礎力向上',
    '二次関数の基本問題を確実に解けるようになる',
    '数学',
    CURRENT_DATE + 30,
    'high',
    'academic',
    '基本問題の正答率90%以上',
    'in_progress',
    40
),
(
    '11111111-1111-1111-1111-111111111111',
    '66666666-6666-6666-6666-666666666666',
    '44444444-4444-4444-4444-444444444444',
    '英語リスニング強化',
    'リスニング問題の正答率を向上させる',
    '英語',
    CURRENT_DATE + 60,
    'medium',
    'skill',
    'リスニング問題の正答率80%以上',
    'in_progress',
    25
);

-- ==========================================
-- 12. 統計情報の表示
-- ==========================================

-- 作成されたテーブルの確認
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'organizations', 'users', 'students', 'task_categories', 'student_tasks',
    'interview_schedules', 'student_interviews', 'learning_objectives', 
    'progress_tracking', 'teaching_records', 'mock_exam_results'
)
ORDER BY tablename;

-- 各テーブルのレコード数を表示
SELECT 
    'organizations' as table_name, COUNT(*) as record_count FROM organizations
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'task_categories', COUNT(*) FROM task_categories
UNION ALL
SELECT 'student_tasks', COUNT(*) FROM student_tasks
UNION ALL
SELECT 'interview_schedules', COUNT(*) FROM interview_schedules
UNION ALL
SELECT 'learning_objectives', COUNT(*) FROM learning_objectives
ORDER BY table_name;

-- セットアップ完了メッセージ
SELECT 
    '✅ 新データベース設計のセットアップが完了しました！' as message,
    NOW() as completed_at;

-- 主要な改善点
SELECT 
    '🆕 新機能' as category,
    '面談スケジュール管理' as feature,
    'interview_schedules テーブルで面談予定を管理' as description
UNION ALL
SELECT 
    '🆕 新機能',
    '生徒タスク管理',
    'student_tasks テーブルで宿題・課題を管理'
UNION ALL
SELECT 
    '🆕 新機能',
    '学習目標・進捗管理',
    'learning_objectives, progress_tracking テーブルで目標管理'
UNION ALL
SELECT 
    '🔒 プライバシー強化',
    '個人情報の最小化',
    '不要な個人情報項目を削除、必要最小限のみ保持'
UNION ALL
SELECT 
    '📊 可視化改善',
    'サマリービューの追加',
    'student_summary, teacher_workload ビューでダッシュボード対応'
ORDER BY category, feature; 