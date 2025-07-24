-- カリキュラム関連テーブルの作成（シンプル版）

-- textbook_routesテーブル（組織IDなし版）
CREATE TABLE IF NOT EXISTS textbook_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  subject_detail TEXT,
  level INTEGER CHECK (level BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- textbooksテーブルが存在しない場合は作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'textbooks') THEN
        CREATE TABLE textbooks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          route_id UUID REFERENCES textbook_routes(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          publisher TEXT,
          duration INTEGER, -- 推奨期間（週）
          prerequisite_level INTEGER CHECK (prerequisite_level BETWEEN 1 AND 5),
          target_level INTEGER CHECK (target_level BETWEEN 1 AND 5),
          subject TEXT NOT NULL,
          subject_detail TEXT,
          order_index INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- textbooksテーブルが既に存在する場合、必要なカラムを追加
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES textbook_routes(id) ON DELETE CASCADE;
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS duration INTEGER;
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS prerequisite_level INTEGER CHECK (prerequisite_level BETWEEN 1 AND 5);
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS target_level INTEGER CHECK (target_level BETWEEN 1 AND 5);
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS subject TEXT;
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS subject_detail TEXT;
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS order_index INTEGER;
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- student_levelsテーブル
CREATE TABLE IF NOT EXISTS student_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  current_level INTEGER CHECK (current_level BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, subject)
);

-- study_plansテーブル
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  total_duration INTEGER,
  target_university TEXT,
  target_faculty TEXT,
  exam_date DATE,
  daily_study_hours DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- study_tasksテーブル
CREATE TABLE IF NOT EXISTS study_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE,
  textbook_id UUID REFERENCES textbooks(id),
  textbook_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  duration INTEGER,
  status TEXT CHECK (status IN ('pending', 'in-progress', 'completed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE textbook_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_tasks ENABLE ROW LEVEL SECURITY;

-- シンプルなRLSポリシー（認証されたユーザーはすべてアクセス可能）
-- textbook_routes
DROP POLICY IF EXISTS "認証されたユーザーは参考書ルートを表示可能" ON textbook_routes;
CREATE POLICY "認証されたユーザーは参考書ルートを表示可能"
  ON textbook_routes FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "認証されたユーザーは参考書ルートを作成可能" ON textbook_routes;
CREATE POLICY "認証されたユーザーは参考書ルートを作成可能"
  ON textbook_routes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "認証されたユーザーは参考書ルートを更新可能" ON textbook_routes;
CREATE POLICY "認証されたユーザーは参考書ルートを更新可能"
  ON textbook_routes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "認証されたユーザーは参考書ルートを削除可能" ON textbook_routes;
CREATE POLICY "認証されたユーザーは参考書ルートを削除可能"
  ON textbook_routes FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- textbooks
DROP POLICY IF EXISTS "認証されたユーザーは参考書を表示可能" ON textbooks;
CREATE POLICY "認証されたユーザーは参考書を表示可能"
  ON textbooks FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "認証されたユーザーは参考書を作成可能" ON textbooks;
CREATE POLICY "認証されたユーザーは参考書を作成可能"
  ON textbooks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "認証されたユーザーは参考書を更新可能" ON textbooks;
CREATE POLICY "認証されたユーザーは参考書を更新可能"
  ON textbooks FOR UPDATE
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "認証されたユーザーは参考書を削除可能" ON textbooks;
CREATE POLICY "認証されたユーザーは参考書を削除可能"
  ON textbooks FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- student_levels
DROP POLICY IF EXISTS "認証されたユーザーは生徒レベルを表示可能" ON student_levels;
CREATE POLICY "認証されたユーザーは生徒レベルを表示可能"
  ON student_levels FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "認証されたユーザーは生徒レベルを作成可能" ON student_levels;
CREATE POLICY "認証されたユーザーは生徒レベルを作成可能"
  ON student_levels FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "認証されたユーザーは生徒レベルを更新可能" ON student_levels;
CREATE POLICY "認証されたユーザーは生徒レベルを更新可能"
  ON student_levels FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- study_plans
DROP POLICY IF EXISTS "認証されたユーザーは学習計画を表示可能" ON study_plans;
CREATE POLICY "認証されたユーザーは学習計画を表示可能"
  ON study_plans FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "認証されたユーザーは学習計画を作成可能" ON study_plans;
CREATE POLICY "認証されたユーザーは学習計画を作成可能"
  ON study_plans FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "認証されたユーザーは学習計画を更新可能" ON study_plans;
CREATE POLICY "認証されたユーザーは学習計画を更新可能"
  ON study_plans FOR UPDATE
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "認証されたユーザーは学習計画を削除可能" ON study_plans;
CREATE POLICY "認証されたユーザーは学習計画を削除可能"
  ON study_plans FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- study_tasks
DROP POLICY IF EXISTS "認証されたユーザーは学習タスクを表示可能" ON study_tasks;
CREATE POLICY "認証されたユーザーは学習タスクを表示可能"
  ON study_tasks FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "認証されたユーザーは学習タスクを作成可能" ON study_tasks;
CREATE POLICY "認証されたユーザーは学習タスクを作成可能"
  ON study_tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "認証されたユーザーは学習タスクを更新可能" ON study_tasks;
CREATE POLICY "認証されたユーザーは学習タスクを更新可能"
  ON study_tasks FOR UPDATE
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "認証されたユーザーは学習タスクを削除可能" ON study_tasks;
CREATE POLICY "認証されたユーザーは学習タスクを削除可能"
  ON study_tasks FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_textbooks_route ON textbooks(route_id);
CREATE INDEX IF NOT EXISTS idx_student_levels_student ON student_levels(student_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_student ON study_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_study_tasks_plan ON study_tasks(plan_id);