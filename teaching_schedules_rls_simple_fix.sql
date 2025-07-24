-- ==========================================
-- teaching_schedules RLS修正（確実動作版）
-- ==========================================

-- Step 1: RLS有効化
ALTER TABLE teaching_schedules ENABLE ROW LEVEL SECURITY;

-- Step 2: 既存ポリシー削除
DROP POLICY IF EXISTS "teaching_schedules_organization_isolation" ON teaching_schedules;
DROP POLICY IF EXISTS "teaching_schedules_insert_policy" ON teaching_schedules;
DROP POLICY IF EXISTS "teaching_schedules_update_policy" ON teaching_schedules;
DROP POLICY IF EXISTS "teaching_schedules_delete_policy" ON teaching_schedules;

-- Step 3: SELECT ポリシー（組織分離）
CREATE POLICY "teaching_schedules_organization_isolation" 
ON teaching_schedules FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::uuid 
        AND users.organization_id = teaching_schedules.organization_id
    )
);

-- Step 4: INSERT ポリシー
CREATE POLICY "teaching_schedules_insert_policy" 
ON teaching_schedules FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::uuid 
        AND users.organization_id = teaching_schedules.organization_id
        AND users.role IN ('admin', 'teacher')
    )
);

-- Step 5: UPDATE ポリシー
CREATE POLICY "teaching_schedules_update_policy" 
ON teaching_schedules FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::uuid 
        AND users.organization_id = teaching_schedules.organization_id
        AND users.role IN ('admin', 'teacher')
    )
);

-- Step 6: DELETE ポリシー（管理者のみ）
CREATE POLICY "teaching_schedules_delete_policy" 
ON teaching_schedules FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::uuid 
        AND users.organization_id = teaching_schedules.organization_id
        AND users.role = 'admin'
    )
);

-- ==========================================
-- 確認クエリ
-- ==========================================

-- RLS状態確認
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename = 'teaching_schedules';

-- ポリシー一覧確認
SELECT 
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'teaching_schedules' 
AND schemaname = 'public'
ORDER BY policyname;

-- 成功メッセージ
SELECT 'teaching_schedules RLS修正が正常に完了しました!' as result; 