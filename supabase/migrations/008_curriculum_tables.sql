-- カリキュラム関連テーブル

-- 参考書ルートテーブル
CREATE TABLE textbook_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  subject_detail TEXT,
  level INTEGER CHECK (level BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 参考書テーブル
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

-- 生徒レベルテーブル
CREATE TABLE student_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  current_level INTEGER CHECK (current_level BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, subject)
);

-- 学習計画テーブル
CREATE TABLE study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  total_duration INTEGER,
  target_university TEXT,
  target_faculty TEXT,
  exam_date DATE,
  daily_study_hours DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 学習タスクテーブル
CREATE TABLE study_tasks (
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

-- RLSポリシー
ALTER TABLE textbook_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_tasks ENABLE ROW LEVEL SECURITY;

-- textbook_routes ポリシー
CREATE POLICY "組織メンバーは自分の組織の参考書ルートを表示可能"
  ON textbook_routes FOR SELECT
  USING (organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "講師以上の権限で参考書ルートを作成可能"
  ON textbook_routes FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() 
      AND om.role IN ('owner', 'teacher')
    )
  );

CREATE POLICY "講師以上の権限で参考書ルートを更新可能"
  ON textbook_routes FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() 
      AND om.role IN ('owner', 'teacher')
    )
  );

CREATE POLICY "講師以上の権限で参考書ルートを削除可能"
  ON textbook_routes FOR DELETE
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() 
      AND om.role IN ('owner', 'teacher')
    )
  );

-- textbooks ポリシー
CREATE POLICY "組織メンバーは参考書を表示可能"
  ON textbooks FOR SELECT
  USING (
    route_id IN (
      SELECT tr.id 
      FROM textbook_routes tr
      WHERE tr.organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "講師以上の権限で参考書を作成可能"
  ON textbooks FOR INSERT
  WITH CHECK (
    route_id IN (
      SELECT tr.id 
      FROM textbook_routes tr
      WHERE tr.organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid() 
        AND om.role IN ('owner', 'teacher')
      )
    )
  );

CREATE POLICY "講師以上の権限で参考書を更新可能"
  ON textbooks FOR UPDATE
  USING (
    route_id IN (
      SELECT tr.id 
      FROM textbook_routes tr
      WHERE tr.organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid() 
        AND om.role IN ('owner', 'teacher')
      )
    )
  );

CREATE POLICY "講師以上の権限で参考書を削除可能"
  ON textbooks FOR DELETE
  USING (
    route_id IN (
      SELECT tr.id 
      FROM textbook_routes tr
      WHERE tr.organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid() 
        AND om.role IN ('owner', 'teacher')
      )
    )
  );

-- student_levels ポリシー
CREATE POLICY "生徒は自分のレベルを表示可能"
  ON student_levels FOR SELECT
  USING (
    student_id IN (
      SELECT s.id 
      FROM students s
      WHERE s.organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "講師以上の権限で生徒レベルを作成可能"
  ON student_levels FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT s.id 
      FROM students s
      WHERE s.organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid() 
        AND om.role IN ('owner', 'teacher')
      )
    )
  );

CREATE POLICY "講師以上の権限で生徒レベルを更新可能"
  ON student_levels FOR UPDATE
  USING (
    student_id IN (
      SELECT s.id 
      FROM students s
      WHERE s.organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid() 
        AND om.role IN ('owner', 'teacher')
      )
    )
  );

-- study_plans ポリシー
CREATE POLICY "組織メンバーは学習計画を表示可能"
  ON study_plans FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "講師以上の権限で学習計画を作成可能"
  ON study_plans FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() 
      AND om.role IN ('owner', 'teacher')
    )
  );

CREATE POLICY "講師以上の権限で学習計画を更新可能"
  ON study_plans FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() 
      AND om.role IN ('owner', 'teacher')
    )
  );

CREATE POLICY "講師以上の権限で学習計画を削除可能"
  ON study_plans FOR DELETE
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() 
      AND om.role IN ('owner', 'teacher')
    )
  );

-- study_tasks ポリシー
CREATE POLICY "組織メンバーは学習タスクを表示可能"
  ON study_tasks FOR SELECT
  USING (
    plan_id IN (
      SELECT sp.id 
      FROM study_plans sp
      WHERE sp.organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "講師以上の権限で学習タスクを作成可能"
  ON study_tasks FOR INSERT
  WITH CHECK (
    plan_id IN (
      SELECT sp.id 
      FROM study_plans sp
      WHERE sp.organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid() 
        AND om.role IN ('owner', 'teacher')
      )
    )
  );

CREATE POLICY "講師以上の権限で学習タスクを更新可能"
  ON study_tasks FOR UPDATE
  USING (
    plan_id IN (
      SELECT sp.id 
      FROM study_plans sp
      WHERE sp.organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid() 
        AND om.role IN ('owner', 'teacher')
      )
    )
  );

CREATE POLICY "講師以上の権限で学習タスクを削除可能"
  ON study_tasks FOR DELETE
  USING (
    plan_id IN (
      SELECT sp.id 
      FROM study_plans sp
      WHERE sp.organization_id IN (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = auth.uid() 
        AND om.role IN ('owner', 'teacher')
      )
    )
  );

-- インデックス
CREATE INDEX idx_textbook_routes_organization ON textbook_routes(organization_id);
CREATE INDEX idx_textbooks_route ON textbooks(route_id);
CREATE INDEX idx_student_levels_student ON student_levels(student_id);
CREATE INDEX idx_study_plans_student ON study_plans(student_id);
CREATE INDEX idx_study_plans_organization ON study_plans(organization_id);
CREATE INDEX idx_study_tasks_plan ON study_tasks(plan_id);