-- ==========================================
-- 生徒管理システム拡張：面談・指導・模試の分離管理
-- ==========================================

-- 1. 生徒面談テーブル（面談専用）
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

-- 2. 指導履歴テーブル（授業・指導専用）
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

-- 3. 模試結果テーブル（模試専用）
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

-- 4. 模試スケジュールテーブル（予定管理）
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
-- インデックス作成
-- ==========================================

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
-- Row Level Security (RLS) 設定
-- ==========================================

-- RLSを有効化
ALTER TABLE student_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_schedule ENABLE ROW LEVEL SECURITY;

-- 生徒面談のRLSポリシー
CREATE POLICY "Student interviews organization access" ON student_interviews
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- 指導履歴のRLSポリシー
CREATE POLICY "Teaching records organization access" ON teaching_records
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- 模試結果のRLSポリシー
CREATE POLICY "Mock exam results organization access" ON mock_exam_results
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- 模試スケジュールのRLSポリシー
CREATE POLICY "Mock exam schedule organization access" ON mock_exam_schedule
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- ==========================================
-- サンプルデータ挿入
-- ==========================================

-- サンプル生徒面談データ
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
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM students WHERE name = '田中太郎' LIMIT 1),
    '11111111-1111-1111-1111-111111111111',
    'regular',
    CURRENT_DATE - INTERVAL '7 days',
    45,
    ARRAY['学習状況', '進路相談', '生活面'],
    '数学の成績向上について相談。基礎固めを重点的に行う方針で合意。',
    '積極的で意欲的。ただし基礎計算でミスが多い。',
    ARRAY['基礎計算練習を毎日30分', '次回模試への対策']
) ON CONFLICT DO NOTHING;

-- サンプル指導履歴データ
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
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM students WHERE name = '田中太郎' LIMIT 1),
    '11111111-1111-1111-1111-111111111111',
    CURRENT_DATE - INTERVAL '2 days',
    '数学',
    'individual',
    90,
    '二次関数',
    ARRAY['教科書', 'プリントA-1', '過去問集'],
    '二次関数のグラフの書き方を復習。頂点と軸の求め方を重点的に指導。',
    'プリントA-2の問題1-10',
    'good',
    'active'
) ON CONFLICT DO NOTHING;

-- サンプル模試結果データ
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
) VALUES (
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
) ON CONFLICT DO NOTHING; 