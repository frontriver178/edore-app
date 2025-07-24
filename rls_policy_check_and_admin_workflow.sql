-- ==========================================
-- RLSポリシー確認とSaaS運営管理システム
-- セキュリティチェック・招待コード作成・運営ワークフロー
-- ==========================================

-- ==========================================
-- 1. RLSポリシーの動作確認
-- ==========================================

-- 現在のRLSポリシー一覧確認
SELECT '=== 現在のRLSポリシー一覧 ===' as section;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- RLS有効状態確認
SELECT '=== RLS有効状態確認 ===' as section;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('organizations', 'users', 'students', 'invitation_codes', 'organization_applications', 'user_onboarding_status')
ORDER BY tablename;

-- ==========================================
-- 2. RLSポリシーテスト関数
-- ==========================================

-- RLSポリシーテスト関数（組織間データ分離確認）
CREATE OR REPLACE FUNCTION test_rls_policies(test_user_id UUID, test_org_id UUID)
RETURNS TABLE(
    test_name TEXT,
    table_name TEXT,
    expected_result TEXT,
    actual_result TEXT,
    status TEXT
) AS $$
DECLARE
    record_count INTEGER;
BEGIN
    -- テスト用ユーザーデータ作成
    INSERT INTO users (id, organization_id, email, name, role)
    VALUES (test_user_id, test_org_id, 'test-rls@example.com', 'RLSテストユーザー', 'admin')
    ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

    -- テスト用学生データ作成
    INSERT INTO students (organization_id, name, grade, status)
    VALUES (test_org_id, 'RLSテスト生徒', 10, 'active');

    -- students テーブルのRLSテスト
    SET row_security = on;
    SET LOCAL ROLE authenticated;
    
    -- 現在のユーザー設定
    PERFORM set_config('request.jwt.claims', '{"sub":"' || test_user_id || '"}', true);
    
    -- 同じ組織の学生のみアクセス可能かテスト
    SELECT COUNT(*) INTO record_count FROM students WHERE organization_id = test_org_id;
    
    RETURN QUERY SELECT 
        'organization_data_isolation'::TEXT,
        'students'::TEXT,
        'same_org_access_allowed'::TEXT,
        CASE WHEN record_count > 0 THEN 'access_granted' ELSE 'access_denied' END::TEXT,
        CASE WHEN record_count > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT;

    -- 他の組織の学生にアクセス不可かテスト
    SELECT COUNT(*) INTO record_count FROM students WHERE organization_id != test_org_id;
    
    RETURN QUERY SELECT 
        'cross_organization_isolation'::TEXT,
        'students'::TEXT,
        'other_org_access_denied'::TEXT,
        CASE WHEN record_count = 0 THEN 'access_denied' ELSE 'access_granted' END::TEXT,
        CASE WHEN record_count = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT;

    -- クリーンアップ
    DELETE FROM students WHERE name = 'RLSテスト生徒';
    DELETE FROM users WHERE email = 'test-rls@example.com';
    
    RESET ROLE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 3. 招待コード管理システム
-- ==========================================

-- 招待コード生成関数（運営専用）
CREATE OR REPLACE FUNCTION admin_create_invitation_code(
    p_organization_id UUID,
    p_role TEXT,
    p_expires_days INTEGER DEFAULT 30,
    p_created_by TEXT DEFAULT 'システム管理者',
    p_custom_code TEXT DEFAULT NULL
) RETURNS TABLE(
    success BOOLEAN,
    invitation_code TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    message TEXT
) AS $$
DECLARE
    new_code TEXT;
    expiry TIMESTAMP WITH TIME ZONE;
    org_exists BOOLEAN;
BEGIN
    -- 組織存在確認
    SELECT EXISTS(SELECT 1 FROM organizations WHERE id = p_organization_id) INTO org_exists;
    
    IF NOT org_exists THEN
        RETURN QUERY SELECT false, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, '指定された組織が存在しません。';
        RETURN;
    END IF;

    -- 役割確認
    IF p_role NOT IN ('admin', 'teacher') THEN
        RETURN QUERY SELECT false, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, '役割は admin または teacher である必要があります。';
        RETURN;
    END IF;

    -- コード生成
    IF p_custom_code IS NOT NULL THEN
        new_code := UPPER(p_custom_code);
    ELSE
        new_code := UPPER(p_role) || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 8));
    END IF;

    -- 有効期限設定
    expiry := NOW() + (p_expires_days || ' days')::INTERVAL;

    -- 重複チェック
    IF EXISTS (SELECT 1 FROM invitation_codes WHERE code = new_code) THEN
        RETURN QUERY SELECT false, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, '指定されたコードは既に存在します。';
        RETURN;
    END IF;

    -- 招待コード作成
    INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by, created_at)
    VALUES (p_organization_id, new_code, p_role, expiry, p_created_by, NOW());

    RETURN QUERY SELECT true, new_code, expiry, '招待コードが正常に作成されました。';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 招待コード一覧表示（運営専用）
CREATE OR REPLACE FUNCTION admin_list_invitation_codes(p_organization_id UUID DEFAULT NULL)
RETURNS TABLE(
    code TEXT,
    organization_name TEXT,
    role TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    used BOOLEAN,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by_email TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ic.code,
        o.name as organization_name,
        ic.role,
        ic.expires_at,
        ic.used,
        ic.used_at,
        u.email as used_by_email,
        ic.created_by,
        ic.created_at,
        CASE 
            WHEN ic.used = true THEN 'USED'
            WHEN ic.expires_at < NOW() THEN 'EXPIRED'
            ELSE 'ACTIVE'
        END as status
    FROM invitation_codes ic
    JOIN organizations o ON ic.organization_id = o.id
    LEFT JOIN users u ON ic.used_by = u.id
    WHERE (p_organization_id IS NULL OR ic.organization_id = p_organization_id)
    ORDER BY ic.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 招待コード無効化（運営専用）
CREATE OR REPLACE FUNCTION admin_revoke_invitation_code(p_code TEXT)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    code_exists BOOLEAN;
    already_used BOOLEAN;
BEGIN
    -- コード存在確認
    SELECT EXISTS(SELECT 1 FROM invitation_codes WHERE code = p_code) INTO code_exists;
    
    IF NOT code_exists THEN
        RETURN QUERY SELECT false, '指定された招待コードが見つかりません。';
        RETURN;
    END IF;

    -- 使用済み確認
    SELECT used INTO already_used FROM invitation_codes WHERE code = p_code;
    
    IF already_used THEN
        RETURN QUERY SELECT false, '既に使用済みの招待コードは無効化できません。';
        RETURN;
    END IF;

    -- 有効期限を過去に設定して無効化
    UPDATE invitation_codes 
    SET expires_at = NOW() - INTERVAL '1 day'
    WHERE code = p_code;

    RETURN QUERY SELECT true, '招待コードが正常に無効化されました。';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. 組織管理システム（運営専用）
-- ==========================================

-- 新規組織作成（運営専用）
CREATE OR REPLACE FUNCTION admin_create_organization(
    p_org_name TEXT,
    p_contact_email TEXT,
    p_phone TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_subscription_plan TEXT DEFAULT 'basic',
    p_created_by TEXT DEFAULT 'システム管理者'
) RETURNS TABLE(
    success BOOLEAN,
    organization_id UUID,
    admin_invitation_code TEXT,
    teacher_invitation_code TEXT,
    message TEXT
) AS $$
DECLARE
    new_org_id UUID;
    admin_code TEXT;
    teacher_code TEXT;
BEGIN
    -- 組織作成
    INSERT INTO organizations (name, contact_email, phone, address, subscription_plan, subscription_status, created_at, updated_at)
    VALUES (p_org_name, p_contact_email, p_phone, p_address, p_subscription_plan, 'active', NOW(), NOW())
    RETURNING id INTO new_org_id;

    -- 管理者招待コード生成
    SELECT invitation_code INTO admin_code
    FROM admin_create_invitation_code(new_org_id, 'admin', 30, p_created_by, NULL)
    WHERE success = true;

    -- 講師招待コード生成
    SELECT invitation_code INTO teacher_code
    FROM admin_create_invitation_code(new_org_id, 'teacher', 30, p_created_by, NULL)
    WHERE success = true;

    RETURN QUERY SELECT 
        true, 
        new_org_id, 
        admin_code, 
        teacher_code, 
        '組織と招待コードが正常に作成されました。';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 組織申請承認（運営専用）
CREATE OR REPLACE FUNCTION admin_approve_organization_application(
    p_application_id UUID,
    p_approved_by TEXT,
    p_notes TEXT DEFAULT NULL
) RETURNS TABLE(
    success BOOLEAN,
    organization_id UUID,
    admin_invitation_code TEXT,
    message TEXT
) AS $$
DECLARE
    app_record RECORD;
    new_org_id UUID;
    admin_code TEXT;
BEGIN
    -- 申請情報取得
    SELECT * INTO app_record
    FROM organization_applications
    WHERE id = p_application_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, '指定された申請が見つからないか、既に処理済みです。';
        RETURN;
    END IF;

    -- 組織作成
    SELECT organization_id, admin_invitation_code INTO new_org_id, admin_code
    FROM admin_create_organization(
        app_record.organization_name,
        app_record.applicant_email,
        app_record.phone,
        app_record.address,
        'basic',
        p_approved_by
    )
    WHERE success = true;

    -- 申請ステータス更新
    UPDATE organization_applications
    SET status = 'approved',
        processed_at = NOW(),
        processed_by = p_approved_by,
        notes = p_notes
    WHERE id = p_application_id;

    -- 申請者にユーザーレコード作成（管理者として）
    INSERT INTO users (organization_id, email, name, role, created_at, updated_at)
    VALUES (new_org_id, app_record.applicant_email, app_record.applicant_name, 'admin', NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        role = EXCLUDED.role,
        updated_at = NOW();

    RETURN QUERY SELECT true, new_org_id, admin_code, '組織申請が承認され、組織が作成されました。';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. 運営ダッシュボード用ビュー
-- ==========================================

-- 運営ダッシュボード統計
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'active') as active_organizations,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM invitation_codes WHERE used = false AND expires_at > NOW()) as active_invitations,
    (SELECT COUNT(*) FROM organization_applications WHERE status = 'pending') as pending_applications,
    (SELECT COUNT(*) FROM students WHERE status = 'active') as total_students;

-- 最近の活動一覧
CREATE OR REPLACE VIEW admin_recent_activities AS
SELECT 
    'user_registration' as activity_type,
    u.email as details,
    o.name as organization_name,
    u.created_at as activity_time
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.created_at >= NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'organization_application' as activity_type,
    oa.organization_name || ' by ' || oa.applicant_name as details,
    NULL as organization_name,
    oa.created_at as activity_time
FROM organization_applications oa
WHERE oa.created_at >= NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'invitation_used' as activity_type,
    ic.code || ' (' || ic.role || ')' as details,
    o.name as organization_name,
    ic.used_at as activity_time
FROM invitation_codes ic
JOIN organizations o ON ic.organization_id = o.id
WHERE ic.used_at >= NOW() - INTERVAL '7 days'

ORDER BY activity_time DESC;

-- ==========================================
-- 6. 即座実行テスト
-- ==========================================

-- RLSポリシー動作確認
SELECT '=== RLSポリシー動作テスト ===' as section;
-- SELECT * FROM test_rls_policies('test-user-id'::UUID, '11111111-1111-1111-1111-111111111111'::UUID);

-- 運営ダッシュボード統計表示
SELECT '=== 運営ダッシュボード統計 ===' as section;
SELECT * FROM admin_dashboard_stats;

-- 招待コード一覧表示
SELECT '=== 現在の招待コード一覧 ===' as section;
SELECT * FROM admin_list_invitation_codes() LIMIT 10;

-- 最近の活動表示
SELECT '=== 最近の活動 ===' as section;
SELECT * FROM admin_recent_activities LIMIT 10;

-- 完了メッセージ
SELECT '🔒 RLSポリシー確認と運営管理システムのセットアップが完了しました!' as message; 