-- ===========================================
-- セキュリティ強化：全テーブルのRLSポリシー最適化
-- ===========================================

-- organizationsテーブルのポリシー最適化
DROP POLICY IF EXISTS "Allow all select organizations" ON organizations;
DROP POLICY IF EXISTS "Organization admin access" ON organizations;

-- 組織情報は自分が所属している組織のみ参照可能
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- 管理者のみ組織情報を更新可能
CREATE POLICY "Admins can update their organization" ON organizations
    FOR UPDATE
    USING (
        id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 新規組織作成は認証済みユーザーのみ可能
CREATE POLICY "Authenticated users can create organizations" ON organizations
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- studentsテーブルのポリシー強化
DROP POLICY IF EXISTS "Students organization access" ON students;

-- 自分の組織の生徒のみ参照可能
CREATE POLICY "Users can view organization students" ON students
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- 講師・管理者のみ生徒を追加可能
CREATE POLICY "Teachers and admins can add students" ON students
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );

-- 講師・管理者のみ生徒情報を更新可能
CREATE POLICY "Teachers and admins can update students" ON students
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );

-- 管理者のみ生徒を削除可能
CREATE POLICY "Admins can delete students" ON students
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- interviewsテーブルのポリシー強化
DROP POLICY IF EXISTS "Interviews organization access" ON interviews;

-- 自分の組織の面談記録のみ参照可能
CREATE POLICY "Users can view organization interviews" ON interviews
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- 講師・管理者のみ面談記録を追加可能
CREATE POLICY "Teachers and admins can add interviews" ON interviews
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
        AND teacher_id = auth.uid()  -- 自分が担当講師の場合のみ
    );

-- tasksテーブルのポリシー強化
DROP POLICY IF EXISTS "Tasks organization access" ON tasks;

-- 自分の組織のタスクのみ参照可能
CREATE POLICY "Users can view organization tasks" ON tasks
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- 講師・管理者のみタスクを作成可能
CREATE POLICY "Teachers and admins can create tasks" ON tasks
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );

-- materialsテーブルのポリシー強化
DROP POLICY IF EXISTS "Materials organization access" ON materials;

-- 自分の組織の教材のみ参照可能
CREATE POLICY "Users can view organization materials" ON materials
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- 講師・管理者のみ教材を追加可能
CREATE POLICY "Teachers and admins can add materials" ON materials
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );

-- scoresテーブルのポリシー強化
DROP POLICY IF EXISTS "Scores organization access" ON scores;

-- 自分の組織の成績のみ参照可能
CREATE POLICY "Users can view organization scores" ON scores
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- 講師・管理者のみ成績を追加可能
CREATE POLICY "Teachers and admins can add scores" ON scores
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );

-- ===========================================
-- セキュリティ監査用ビュー（管理者用）
-- ===========================================

-- 現在のRLSポリシー一覧を確認するビュー
CREATE OR REPLACE VIEW security_policies AS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd; 