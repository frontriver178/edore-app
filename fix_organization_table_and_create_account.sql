-- ==========================================
-- organizationsテーブル構造確認と新規アカウント作成
-- ==========================================

-- 1. organizationsテーブルの実際の構造確認
SELECT '=== organizationsテーブルの構造 ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'organizations'
ORDER BY ordinal_position;

-- 2. 既存の組織確認
SELECT '=== 既存組織一覧 ===' as section;
SELECT * FROM organizations LIMIT 3;

-- ==========================================
-- 3. 修正版：正しい構造での組織作成
-- ==========================================

-- 方法A: 直接INSERT（シンプル）
INSERT INTO organizations (name, contact_email, subscription_plan, subscription_status)
VALUES ('コンツ塾', 'kazuyochi07@gmail.com', 'basic', 'active')
RETURNING id, name, contact_email, subscription_plan;

-- 方法B: admin_create_organization関数の修正版作成
CREATE OR REPLACE FUNCTION admin_create_organization_fixed(
    p_org_name TEXT,
    p_contact_email TEXT,
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
    -- 実際のテーブル構造に合わせて組織作成
    INSERT INTO organizations (name, contact_email, subscription_plan, subscription_status, created_at, updated_at)
    VALUES (p_org_name, p_contact_email, p_subscription_plan, 'active', NOW(), NOW())
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

-- ==========================================
-- 4. 修正版関数で組織作成実行
-- ==========================================

SELECT '=== 修正版関数での組織作成 ===' as section;
SELECT * FROM admin_create_organization_fixed(
    'コンツ塾',
    'kazuyochi07@gmail.com',
    'basic',
    '運営チーム'
);

-- ==========================================
-- 5. 作成結果確認
-- ==========================================

-- 新しく作成された組織確認
SELECT '=== 作成された組織 ===' as section;
SELECT 
    id,
    name,
    contact_email,
    subscription_plan,
    subscription_status,
    created_at
FROM organizations 
WHERE name = 'コンツ塾';

-- 発行された招待コード確認
SELECT '=== 発行された招待コード ===' as section;
SELECT 
    code,
    role,
    expires_at,
    'まもなく使用可能' as status
FROM invitation_codes 
WHERE created_at >= NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC; 