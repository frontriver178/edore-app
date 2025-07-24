-- ==========================================
-- シンプル・確実なアカウント作成
-- ==========================================

-- Step 1: organizationsテーブル構造確認
SELECT '=== organizationsテーブル構造 ===' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'organizations' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: 新規組織作成（直接INSERT）
INSERT INTO organizations (name, contact_email, subscription_plan, subscription_status, created_at, updated_at)
VALUES ('コンツ塾', 'kazuyochi07@gmail.com', 'basic', 'active', NOW(), NOW())
ON CONFLICT (contact_email) DO UPDATE SET 
    name = EXCLUDED.name,
    updated_at = NOW()
RETURNING id as new_organization_id, name, contact_email;

-- Step 3: 作成された組織のIDを取得して確認
SELECT '=== 作成された組織確認 ===' as info;
SELECT id, name, contact_email, subscription_status
FROM organizations 
WHERE contact_email = 'kazuyochi07@gmail.com';

-- ==========================================
-- Step 4: 招待コード発行（シンプル版）
-- ==========================================

-- 管理者招待コード作成
DO $$
DECLARE
    org_id UUID;
    new_admin_code TEXT;
    new_teacher_code TEXT;
BEGIN
    -- 組織IDを取得
    SELECT id INTO org_id FROM organizations WHERE contact_email = 'kazuyochi07@gmail.com';
    
    -- 管理者コード生成
    new_admin_code := 'ADMIN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 8));
    
    INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by, created_at)
    VALUES (org_id, new_admin_code, 'admin', NOW() + INTERVAL '30 days', '運営チーム', NOW());
    
    -- 講師コード生成
    new_teacher_code := 'TEACHER-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 8));
    
    INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by, created_at)
    VALUES (org_id, new_teacher_code, 'teacher', NOW() + INTERVAL '30 days', '運営チーム', NOW());
    
    -- 結果表示用
    RAISE NOTICE '管理者招待コード: %', new_admin_code;
    RAISE NOTICE '講師招待コード: %', new_teacher_code;
END $$;

-- Step 5: 発行された招待コード確認
SELECT '=== 発行された招待コード ===' as info;
SELECT 
    ic.code,
    ic.role,
    ic.expires_at,
    o.name as organization_name,
    CASE 
        WHEN ic.expires_at > NOW() THEN '✅ 有効'
        ELSE '❌ 期限切れ'
    END as status
FROM invitation_codes ic
JOIN organizations o ON ic.organization_id = o.id
WHERE o.contact_email = 'kazuyochi07@gmail.com'
AND ic.created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY ic.created_at DESC;

-- Step 6: 成功メッセージと次のステップ
SELECT '=== アカウント作成完了！ ===' as result;
SELECT '上記の管理者招待コードをコピーして、オンボーディング画面で使用してください。' as next_step; 