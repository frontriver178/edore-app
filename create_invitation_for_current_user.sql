-- ==========================================
-- 現在のアカウント用招待コード発行
-- ==========================================

-- Step 1: 組織確認
SELECT '=== 利用可能な組織確認 ===' as info;
SELECT id, name, contact_email, subscription_status 
FROM organizations 
WHERE subscription_status = 'active'
ORDER BY created_at DESC;

-- Step 2: handai001mathbot@gmail.com 用の招待コード発行
DO $$
DECLARE
    target_org_id UUID;
    new_admin_code TEXT;
    existing_codes INTEGER;
BEGIN
    -- コンツ塾の組織IDを取得
    SELECT id INTO target_org_id 
    FROM organizations 
    WHERE contact_email = 'kazuyochi07@gmail.com' 
    AND subscription_status = 'active';
    
    IF target_org_id IS NULL THEN
        RAISE EXCEPTION '組織が見つかりません';
    END IF;
    
    -- 管理者コード生成
    new_admin_code := 'ADMIN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 8));
    
    -- 招待コード発行
    INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by, created_at)
    VALUES (target_org_id, new_admin_code, 'admin', NOW() + INTERVAL '30 days', 'システム管理者', NOW());
    
    RAISE NOTICE '新しい管理者招待コード: %', new_admin_code;
    RAISE NOTICE '組織: コンツ塾';
    RAISE NOTICE '有効期限: %', (NOW() + INTERVAL '30 days')::date;
END $$;

-- Step 3: 発行された招待コード確認
SELECT '=== 発行された招待コード一覧 ===' as info;
SELECT 
    ic.code as "招待コード",
    ic.role as "役割",
    o.name as "組織名", 
    ic.expires_at::date as "有効期限",
    CASE 
        WHEN ic.used = true THEN '❌ 使用済み'
        WHEN ic.expires_at < NOW() THEN '⏰ 期限切れ'
        ELSE '✅ 使用可能'
    END as "状態"
FROM invitation_codes ic
JOIN organizations o ON ic.organization_id = o.id
WHERE ic.used = false AND ic.expires_at > NOW()
ORDER BY ic.created_at DESC;

-- Step 4: 使用方法の説明
SELECT '=== 使用方法 ===' as info;
SELECT '1. 上記の招待コードをコピー' as step_1;
SELECT '2. オンボーディング画面で「🎫 招待コードで参加」を選択' as step_2;
SELECT '3. 招待コードを入力してアカウント設定完了' as step_3; 