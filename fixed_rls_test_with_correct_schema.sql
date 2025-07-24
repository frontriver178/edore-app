-- ==========================================
-- teaching_schedules RLS修正（正しいスキーマ版）
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

-- 4. RLS修正完了確認
SELECT '=== teaching_schedules RLS修正完了 ===' as message;

-- 5. RLS状態確認
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('students', 'users', 'teaching_schedules', 'invitation_codes')
ORDER BY tablename;

-- 6. ポリシー一覧確認
SELECT 
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'teaching_schedules' 
AND schemaname = 'public'
ORDER BY policyname;

-- ==========================================
-- 7. 組織分離テスト（正しいスキーマ版）
-- ==========================================

-- テスト用関数（修正版）
CREATE OR REPLACE FUNCTION test_teaching_schedules_rls()
RETURNS TABLE(
    test_name TEXT,
    expected_result TEXT,
    actual_result TEXT,
    status TEXT
) AS $$
DECLARE
    test_org_1 UUID := '11111111-1111-1111-1111-111111111111'::UUID;
    test_org_2 UUID := '22222222-2222-2222-2222-222222222222'::UUID;
    test_user_1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
    test_user_2 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;
    test_student_1 UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID;
    test_student_2 UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd'::UUID;
    record_count INTEGER;
BEGIN
    -- テストデータ準備
    INSERT INTO organizations (id, name, contact_email, subscription_status) 
    VALUES 
        (test_org_1, 'テスト組織1', 'test1@example.com', 'active'),
        (test_org_2, 'テスト組織2', 'test2@example.com', 'active')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    INSERT INTO users (id, organization_id, email, name, role)
    VALUES 
        (test_user_1, test_org_1, 'user1@test.com', 'テストユーザー1', 'admin'),
        (test_user_2, test_org_2, 'user2@test.com', 'テストユーザー2', 'admin')
    ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

    INSERT INTO students (id, organization_id, name, grade, status)
    VALUES 
        (test_student_1, test_org_1, 'テスト生徒1', 10, 'active'),
        (test_student_2, test_org_2, 'テスト生徒2', 11, 'active')
    ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

    -- teaching_schedules テーブルテスト（正しいスキーマ）
    INSERT INTO teaching_schedules (organization_id, student_id, teacher_id, scheduled_date, start_time, end_time, subject, topic, status)
    VALUES 
        (test_org_1, test_student_1, test_user_1, CURRENT_DATE, '16:00', '17:30', '数学', 'テスト授業1', 'scheduled'),
        (test_org_2, test_student_2, test_user_2, CURRENT_DATE, '16:00', '17:30', '英語', 'テスト授業2', 'scheduled');

    -- RLS設定でユーザー1として実行
    PERFORM set_config('request.jwt.claims', '{"sub":"' || test_user_1 || '"}', true);
    
    -- 同じ組織のスケジュールにアクセス可能かテスト
    SELECT COUNT(*) INTO record_count FROM teaching_schedules WHERE organization_id = test_org_1;
    RETURN QUERY SELECT 
        'teaching_schedules_same_org_access'::TEXT,
        'access_granted'::TEXT,
        CASE WHEN record_count > 0 THEN 'access_granted' ELSE 'access_denied' END::TEXT,
        CASE WHEN record_count > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT;

    -- 他の組織のスケジュールにアクセス不可かテスト  
    SELECT COUNT(*) INTO record_count FROM teaching_schedules WHERE organization_id = test_org_2;
    RETURN QUERY SELECT 
        'teaching_schedules_cross_org_isolation'::TEXT,
        'access_denied'::TEXT,
        CASE WHEN record_count = 0 THEN 'access_denied' ELSE 'access_granted' END::TEXT,
        CASE WHEN record_count = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT;

    -- クリーンアップ
    DELETE FROM teaching_schedules WHERE topic LIKE 'テスト授業%';
    DELETE FROM students WHERE name LIKE 'テスト生徒%';
    DELETE FROM users WHERE email LIKE '%@test.com';
    DELETE FROM organizations WHERE name LIKE 'テスト組織%';

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. テスト実行
SELECT '=== RLSテスト実行 ===' as section;
SELECT * FROM test_teaching_schedules_rls();

-- 9. 現在の統計情報
SELECT '=== システム統計 ===' as section;
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
WHERE used = false AND expires_at > NOW()

UNION ALL

SELECT 
    'スケジュール総数' as metric,
    COUNT(*) as value
FROM teaching_schedules;

SELECT '🔒 teaching_schedules RLS修正・テスト完了!' as final_message; 