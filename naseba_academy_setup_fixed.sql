-- ==========================================
-- ナセバ進学予備校 アカウント作成（修正版）
-- ==========================================

-- Step 1: 既存組織チェック
SELECT '=== 既存組織チェック ===' as info;
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '既存組織が見つかりました'
        ELSE '新規組織を作成します'
    END as status,
    COUNT(*) as existing_count
FROM organizations 
WHERE name = 'ナセバ進学予備校';

-- Step 2: 新規組織作成（安全な方法）
DO $$
DECLARE
    existing_count INTEGER;
    new_org_id UUID;
BEGIN
    -- 既存組織チェック
    SELECT COUNT(*) INTO existing_count 
    FROM organizations 
    WHERE name = 'ナセバ進学予備校';
    
    IF existing_count = 0 THEN
        -- 新規組織作成
        INSERT INTO organizations (name, contact_email, subscription_plan, subscription_status, created_at, updated_at)
        VALUES ('ナセバ進学予備校', 'admin@naseba-academy.com', 'basic', 'active', NOW(), NOW())
        RETURNING id INTO new_org_id;
        
        RAISE NOTICE '新規組織が作成されました: %', new_org_id;
    ELSE
        RAISE NOTICE '既存組織を使用します';
    END IF;
END $$;

-- Step 3: 組織確認
SELECT '=== 組織確認 ===' as info;
SELECT id, name, contact_email, subscription_status, created_at
FROM organizations 
WHERE name = 'ナセバ進学予備校';

-- Step 4: 招待コード発行
DO $$
DECLARE
    org_id UUID;
    new_admin_code TEXT;
    new_teacher_code TEXT;
    existing_codes INTEGER;
BEGIN
    -- 組織IDを取得
    SELECT id INTO org_id FROM organizations WHERE name = 'ナセバ進学予備校';
    
    -- 既存の有効な招待コードをチェック
    SELECT COUNT(*) INTO existing_codes
    FROM invitation_codes 
    WHERE organization_id = org_id 
    AND used = false 
    AND expires_at > NOW();
    
    IF existing_codes = 0 THEN
        -- 管理者コード生成
        new_admin_code := 'NASEBA-ADMIN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 8));
        
        INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by, created_at)
        VALUES (org_id, new_admin_code, 'admin', NOW() + INTERVAL '30 days', 'システム管理者', NOW());
        
        -- 講師コード生成
        new_teacher_code := 'NASEBA-TEACHER-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 8));
        
        INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by, created_at)
        VALUES (org_id, new_teacher_code, 'teacher', NOW() + INTERVAL '30 days', 'システム管理者', NOW());
        
        RAISE NOTICE '🎉 ナセバ進学予備校のアカウントが作成されました！';
        RAISE NOTICE '👨‍💼 管理者招待コード: %', new_admin_code;
        RAISE NOTICE '👩‍🏫 講師招待コード: %', new_teacher_code;
        RAISE NOTICE '📅 有効期限: %', (NOW() + INTERVAL '30 days')::date;
    ELSE
        RAISE NOTICE '有効な招待コードが既に存在します: % 個', existing_codes;
    END IF;
END $$;

-- Step 5: 発行された招待コード確認
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
WHERE o.name = 'ナセバ進学予備校'
ORDER BY ic.created_at DESC
LIMIT 5;

-- Step 6: 成功メッセージ
SELECT '🎉 ナセバ進学予備校のアカウント準備完了！' as result;
SELECT '上記の管理者招待コードをコピーして、オンボーディング画面で使用してください。' as next_step;
SELECT 'アクセス方法: ログイン → オンボーディング画面 → 招待コード入力' as access_method; 