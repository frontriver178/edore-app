-- ==========================================
-- teaching_schedules RLS修正と簡潔テスト
-- ==========================================

-- 1. teaching_schedules RLS有効化
ALTER TABLE teaching_schedules ENABLE ROW LEVEL SECURITY;

-- 2. 既存ポリシー削除
DROP POLICY IF EXISTS "teaching_schedules_organization_isolation" ON teaching_schedules;
DROP POLICY IF EXISTS "teaching_schedules_insert_policy" ON teaching_schedules;
DROP POLICY IF EXISTS "teaching_schedules_update_policy" ON teaching_schedules;
DROP POLICY IF EXISTS "teaching_schedules_delete_policy" ON teaching_schedules;

-- 3. 組織分離ポリシー作成
CREATE POLICY "teaching_schedules_organization_isolation" 
ON teaching_schedules FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::uuid 
        AND users.organization_id = teaching_schedules.organization_id
    )
);

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

-- 4. 修正結果確認
SELECT '=== RLS修正完了 ===' as status;

-- 5. 重要テーブルのRLS状態確認
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('students', 'users', 'teaching_schedules', 'invitation_codes')
ORDER BY tablename;

-- 6. teaching_schedulesのポリシー一覧
SELECT 
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'teaching_schedules' 
AND schemaname = 'public'
ORDER BY policyname;

-- 7. 全体統計
SELECT 
    'アクティブ組織数' as metric,
    COUNT(*) as value
FROM organizations 
WHERE subscription_status = 'active'

UNION ALL

SELECT 
    '総ユーザー数' as metric,
    COUNT(*) as value
FROM users

UNION ALL

SELECT 
    '有効招待コード数' as metric,
    COUNT(*) as value
FROM invitation_codes 
WHERE used = false AND expires_at > NOW();

SELECT '🔒 teaching_schedules RLS修正・確認完了!' as message; 