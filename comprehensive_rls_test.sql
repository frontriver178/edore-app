-- ==========================================
-- 包括的RLSポリシーテスト・セキュリティ監査
-- ==========================================

-- ==========================================
-- 1. 全テーブルRLS状態確認
-- ==========================================

SELECT '=== 全テーブルRLS状態チェック ===' as section;

WITH rls_status AS (
    SELECT 
        t.tablename,
        t.rowsecurity,
        COUNT(p.policyname) as policy_count,
        STRING_AGG(p.policyname, ', ' ORDER BY p.policyname) as policies
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
    WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE '_realtime_%'
    GROUP BY t.tablename, t.rowsecurity
    ORDER BY t.tablename
)
SELECT 
    tablename,
    rowsecurity,
    policy_count,
    CASE 
        WHEN rowsecurity = false THEN '🚨 RLS無効'
        WHEN policy_count = 0 THEN '⚠️ ポリシーなし'
        WHEN policy_count < 4 THEN '⚠️ ポリシー不足'
        ELSE '✅ 正常'
    END as status,
    policies
FROM rls_status;

-- ==========================================
-- 2. 重要テーブルの必須ポリシー確認
-- ==========================================

SELECT '=== 重要テーブルのポリシー詳細確認 ===' as section;

SELECT 
    'students' as table_name,
    COUNT(*) as policy_count,
    STRING_AGG(cmd::text, ', ') as operations
FROM pg_policies 
WHERE tablename = 'students' AND schemaname = 'public'

UNION ALL

SELECT 
    'users' as table_name,
    COUNT(*) as policy_count,
    STRING_AGG(cmd::text, ', ') as operations
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'

UNION ALL

SELECT 
    'teaching_schedules' as table_name,
    COUNT(*) as policy_count,
    STRING_AGG(cmd::text, ', ') as operations
FROM pg_policies 
WHERE tablename = 'teaching_schedules' AND schemaname = 'public'

UNION ALL

SELECT 
    'invitation_codes' as table_name,
    COUNT(*) as policy_count,
    STRING_AGG(cmd::text, ', ') as operations
FROM pg_policies 
WHERE tablename = 'invitation_codes' AND schemaname = 'public';

-- ==========================================
-- 3. 組織分離テスト関数（拡張版）
-- ==========================================

CREATE OR REPLACE FUNCTION comprehensive_rls_test()
RETURNS TABLE(
    table_name TEXT,
    test_type TEXT,
    result TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    test_org_1 UUID := '11111111-1111-1111-1111-111111111111'::UUID;
    test_org_2 UUID := '22222222-2222-2222-2222-222222222222'::UUID;
    test_user_1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
    test_user_2 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;
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

    -- students テーブルテスト
    INSERT INTO students (organization_id, name, grade, status)
    VALUES 
        (test_org_1, 'テスト生徒1', 10, 'active'),
        (test_org_2, 'テスト生徒2', 11, 'active');

    -- RLS設定でユーザー1として実行
    PERFORM set_config('request.jwt.claims', '{"sub":"' || test_user_1 || '"}', true);
    
    -- 同じ組織のデータにアクセス可能かテスト
    SELECT COUNT(*) INTO record_count FROM students WHERE organization_id = test_org_1;
    RETURN QUERY SELECT 
        'students'::TEXT,
        'same_org_access'::TEXT,
        record_count::TEXT,
        CASE WHEN record_count > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        '同じ組織のデータが見える'::TEXT;

    -- 他の組織のデータにアクセス不可かテスト  
    SELECT COUNT(*) INTO record_count FROM students WHERE organization_id = test_org_2;
    RETURN QUERY SELECT 
        'students'::TEXT,
        'cross_org_isolation'::TEXT,
        record_count::TEXT,
        CASE WHEN record_count = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        '他の組織のデータは見えない'::TEXT;

    -- teaching_schedules テーブルテスト
    INSERT INTO teaching_schedules (organization_id, teacher_id, title, start_time, end_time)
    VALUES 
        (test_org_1, test_user_1, 'テスト授業1', NOW(), NOW() + INTERVAL '1 hour'),
        (test_org_2, test_user_2, 'テスト授業2', NOW(), NOW() + INTERVAL '1 hour');

    SELECT COUNT(*) INTO record_count FROM teaching_schedules WHERE organization_id = test_org_1;
    RETURN QUERY SELECT 
        'teaching_schedules'::TEXT,
        'same_org_access'::TEXT,
        record_count::TEXT,
        CASE WHEN record_count > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        '同じ組織のスケジュールが見える'::TEXT;

    SELECT COUNT(*) INTO record_count FROM teaching_schedules WHERE organization_id = test_org_2;
    RETURN QUERY SELECT 
        'teaching_schedules'::TEXT,
        'cross_org_isolation'::TEXT,
        record_count::TEXT,
        CASE WHEN record_count = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        '他の組織のスケジュールは見えない'::TEXT;

    -- クリーンアップ
    DELETE FROM teaching_schedules WHERE title LIKE 'テスト授業%';
    DELETE FROM students WHERE name LIKE 'テスト生徒%';
    DELETE FROM users WHERE email LIKE '%@test.com';
    DELETE FROM organizations WHERE name LIKE 'テスト組織%';

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. セキュリティ監査レポート生成
-- ==========================================

CREATE OR REPLACE FUNCTION generate_security_audit_report()
RETURNS TABLE(
    audit_section TEXT,
    item TEXT,
    status TEXT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- RLS有効状態チェック
    WITH rls_check AS (
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('students', 'users', 'teaching_schedules', 'invitation_codes', 
                         'organization_applications', 'user_onboarding_status')
    )
    SELECT 
        'RLS有効状態'::TEXT as audit_section,
        tablename::TEXT as item,
        CASE WHEN rowsecurity THEN '✅ 有効' ELSE '🚨 無効' END::TEXT as status,
        CASE WHEN rowsecurity THEN 'なし' ELSE 'RLSを有効化してください' END::TEXT as recommendation
    FROM rls_check

    UNION ALL

    -- ポリシー数チェック（修正版：テーブルエイリアス使用）
    SELECT 
        'ポリシー完全性'::TEXT,
        t.tablename::TEXT,
        CASE 
            WHEN COUNT(p.policyname) >= 4 THEN '✅ 完全'
            WHEN COUNT(p.policyname) > 0 THEN '⚠️ 不完全'
            ELSE '🚨 なし'
        END::TEXT,
        CASE 
            WHEN COUNT(p.policyname) >= 4 THEN 'なし'
            ELSE 'SELECT/INSERT/UPDATE/DELETEポリシーを設定してください'
        END::TEXT
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
    WHERE t.schemaname = 'public' 
    AND t.tablename IN ('students', 'users', 'teaching_schedules')
    GROUP BY t.tablename

    UNION ALL

    -- 招待コード管理
    SELECT 
        '招待コード管理'::TEXT,
        '期限切れコード'::TEXT,
        CASE 
            WHEN COUNT(*) > 10 THEN '⚠️ 多数'
            WHEN COUNT(*) > 0 THEN '👍 少数'
            ELSE '✅ なし'
        END::TEXT,
        CASE 
            WHEN COUNT(*) > 10 THEN '期限切れコードのクリーンアップを推奨'
            ELSE 'なし'
        END::TEXT
    FROM invitation_codes 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 5. 実行テスト
-- ==========================================

SELECT '=== 包括的RLSテスト実行 ===' as section;
SELECT * FROM comprehensive_rls_test();

SELECT '=== セキュリティ監査レポート ===' as section;
SELECT * FROM generate_security_audit_report();

SELECT '=== テスト完了 ===' as section;
SELECT '🔒 包括的RLSテストが完了しました。上記の結果を確認してください。' as message; 