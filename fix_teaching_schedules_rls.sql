-- ==========================================
-- teaching_schedules テーブル RLS修正
-- ==========================================

-- 1. RLS有効化
ALTER TABLE teaching_schedules ENABLE ROW LEVEL SECURITY;

-- 2. 既存ポリシーがあれば削除
DROP POLICY IF EXISTS "teaching_schedules_organization_isolation" ON teaching_schedules;
DROP POLICY IF EXISTS "teaching_schedules_insert_policy" ON teaching_schedules;
DROP POLICY IF EXISTS "teaching_schedules_update_policy" ON teaching_schedules;
DROP POLICY IF EXISTS "teaching_schedules_delete_policy" ON teaching_schedules;

-- 3. 組織分離ポリシー（SELECT）
CREATE POLICY "teaching_schedules_organization_isolation" 
ON teaching_schedules FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::uuid 
        AND users.organization_id = teaching_schedules.organization_id
    )
);

-- 4. 挿入ポリシー（INSERT）
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

-- 5. 更新ポリシー（UPDATE）
CREATE POLICY "teaching_schedules_update_policy" 
ON teaching_schedules FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::uuid 
        AND users.organization_id = teaching_schedules.organization_id
        AND users.role IN ('admin', 'teacher')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::uuid 
        AND users.organization_id = teaching_schedules.organization_id
        AND users.role IN ('admin', 'teacher')
    )
);

-- 6. 削除ポリシー（DELETE）
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

-- 7. 確認クエリ（修正版：テーブルエイリアス使用）
SELECT '=== teaching_schedules RLS修正完了 ===' as message;

-- 修正されたクエリ：明確なテーブル参照
SELECT 
    t.tablename,
    t.rowsecurity,
    p.policyname,
    p.cmd
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.tablename = 'teaching_schedules'
AND t.schemaname = 'public'
ORDER BY p.policyname;

SELECT '修正完了: teaching_schedulesテーブルのRLSポリシーが有効化されました' as status; 