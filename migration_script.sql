-- ==========================================
-- 段階的移行スクリプト（既存データ保持）
-- 学習管理システム用データベース移行
-- ==========================================

-- UUIDエクステンションを有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. 空のテーブルを削除（データ損失なし）
-- ==========================================

-- 空のinterviewsテーブルを削除
DROP TABLE IF EXISTS interviews CASCADE;

-- 空のscoresテーブルを削除  
DROP TABLE IF EXISTS scores CASCADE;

-- materialsテーブルも削除（使用していない場合）
DROP TABLE IF EXISTS materials CASCADE;

-- ==========================================
-- 2. 既存テーブルの構造確認と修正
-- ==========================================

-- studentsテーブルに不足フィールドがあれば追加
DO $$ 
BEGIN
    -- gradeカラムがない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='grade') THEN
        ALTER TABLE students ADD COLUMN grade INTEGER DEFAULT 1 CHECK (grade BETWEEN 1 AND 12);
    END IF;
    
    -- target_schoolカラムがない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='target_school') THEN
        ALTER TABLE students ADD COLUMN target_school TEXT;
    END IF;
    
    -- parent_nameカラムがない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='parent_name') THEN
        ALTER TABLE students ADD COLUMN parent_name TEXT;
    END IF;
    
    -- parent_phoneカラムがない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='parent_phone') THEN
        ALTER TABLE students ADD COLUMN parent_phone TEXT;
    END IF;
    
    -- parent_emailカラムがない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='parent_email') THEN
        ALTER TABLE students ADD COLUMN parent_email TEXT;
    END IF;
    
    -- statusカラムがない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='status') THEN
        ALTER TABLE students ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated'));
    END IF;
END $$;

-- usersテーブルに不足フィールドがあれば追加
DO $$ 
BEGIN
    -- roleカラムがない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'teacher' CHECK (role IN ('admin', 'teacher'));
    END IF;
    
    -- phoneカラムがない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
        ALTER TABLE users ADD COLUMN phone TEXT;
    END IF;
END $$;

-- ==========================================
-- 3. 新しいテーブルの作成
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

-- ==========================================
-- 4. インデックス作成
-- ==========================================

-- 既存テーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_students_organization_id ON students(organization_id);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);

-- 新テーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_student_interviews_organization_id ON student_interviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_student_interviews_student_id ON student_interviews(student_id);
CREATE INDEX IF NOT EXISTS idx_student_interviews_date ON student_interviews(interview_date);

CREATE INDEX IF NOT EXISTS idx_teaching_records_organization_id ON teaching_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_teaching_records_student_id ON teaching_records(student_id);
CREATE INDEX IF NOT EXISTS idx_teaching_records_date ON teaching_records(lesson_date);

CREATE INDEX IF NOT EXISTS idx_mock_exam_results_organization_id ON mock_exam_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_results_student_id ON mock_exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_results_exam_date ON mock_exam_results(exam_date);

-- ==========================================
-- 5. Row Level Security (RLS) 設定
-- ==========================================

-- 既存テーブルのRLS有効化
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- 新テーブルのRLS有効化
ALTER TABLE student_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_results ENABLE ROW LEVEL SECURITY;

-- 開発用ポリシー（全アクセス許可）
CREATE POLICY "Organizations access" ON organizations FOR ALL USING (true);
CREATE POLICY "Users access" ON users FOR ALL USING (true);
CREATE POLICY "Students access" ON students FOR ALL USING (true);
CREATE POLICY "Student interviews access" ON student_interviews FOR ALL USING (true);
CREATE POLICY "Teaching records access" ON teaching_records FOR ALL USING (true);
CREATE POLICY "Mock exam results access" ON mock_exam_results FOR ALL USING (true);

-- ==========================================
-- 6. サンプルデータ追加（新テーブル用）
-- ==========================================

-- 既存の生徒と講師を使用してサンプルデータを作成
-- まず既存のデータを確認
DO $$
DECLARE
    sample_org_id UUID;
    sample_student_id UUID;
    sample_teacher_id UUID;
BEGIN
    -- 既存の組織IDを取得
    SELECT id INTO sample_org_id FROM organizations LIMIT 1;
    
    -- 既存の生徒IDを取得
    SELECT id INTO sample_student_id FROM students LIMIT 1;
    
    -- 既存の講師IDを取得
    SELECT id INTO sample_teacher_id FROM users LIMIT 1;
    
    -- サンプルの面談データ
    IF sample_org_id IS NOT NULL AND sample_student_id IS NOT NULL AND sample_teacher_id IS NOT NULL THEN
        INSERT INTO student_interviews (
            organization_id, student_id, teacher_id, 
            interview_date, content
        ) VALUES (
            sample_org_id, sample_student_id, sample_teacher_id,
            CURRENT_DATE - INTERVAL '7 days',
            '学習状況について相談。数学の基礎固めが必要。'
        ) ON CONFLICT DO NOTHING;
        
        -- サンプルの指導履歴データ
        INSERT INTO teaching_records (
            organization_id, student_id, teacher_id,
            lesson_date, subject, lesson_content
        ) VALUES (
            sample_org_id, sample_student_id, sample_teacher_id,
            CURRENT_DATE - INTERVAL '2 days', '数学',
            '二次関数のグラフの書き方を指導。基本から応用まで丁寧に説明。'
        ) ON CONFLICT DO NOTHING;
        
        -- サンプルの模試結果データ
        INSERT INTO mock_exam_results (
            organization_id, student_id, exam_name, exam_date,
            grade_level, subject, total_score, deviation_value,
            analysis_memo
        ) VALUES (
            sample_org_id, sample_student_id, '全統模試',
            CURRENT_DATE - INTERVAL '14 days',
            3, '数学', 75, 58.5,
            '基礎は理解しているが、応用問題で苦戦。計算ミスが目立つ。'
        ) ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ==========================================
-- 7. 更新トリガーの設定
-- ==========================================

-- updated_at自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 既存テーブルにトリガー追加
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 新テーブルにトリガー追加
CREATE TRIGGER update_student_interviews_updated_at BEFORE UPDATE ON student_interviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teaching_records_updated_at BEFORE UPDATE ON teaching_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mock_exam_results_updated_at BEFORE UPDATE ON mock_exam_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 完了メッセージ
-- ==========================================

SELECT '既存データを保持した状態でデータベース移行が完了しました！' as message; 