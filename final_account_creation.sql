-- ==========================================
-- 最終版・確実なアカウント作成
-- ==========================================

-- Step 1: organizationsテーブル構造確認
SELECT '=== organizationsテーブル構造 ===' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'organizations' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: 既存組織チェック
SELECT '=== 既存組織チェック ===' as info;
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '既存組織が見つかりました'
        ELSE '新規組織を作成します'
    END as status,
    COUNT(*) as existing_count
FROM organizations 
WHERE contact_email = 'kazuyochi07@gmail.com';

-- Step 3: 新規組織作成（既存チェック付き）
DO $$
DECLARE
    existing_count INTEGER;
    new_org_id UUID;
BEGIN
    -- 既存組織チェック
    SELECT COUNT(*) INTO existing_count 
    FROM organizations 
    WHERE contact_email = 'kazuyochi07@gmail.com';
    
    IF existing_count = 0 THEN
        -- 新規組織作成
        INSERT INTO organizations (name, contact_email, subscription_plan, subscription_status, created_at, updated_at)
        VALUES ('コンツ塾', 'kazuyochi07@gmail.com', 'basic', 'active', NOW(), NOW())
        RETURNING id INTO new_org_id;
        
        RAISE NOTICE '新規組織が作成されました: %', new_org_id;
    ELSE
        RAISE NOTICE '既存組織を使用します';
    END IF;
END $$;

-- Step 4: 作成された組織確認
SELECT '=== 組織確認 ===' as info;
SELECT id, name, contact_email, subscription_status, created_at
FROM organizations 
WHERE contact_email = 'kazuyochi07@gmail.com';

-- ==========================================
-- Step 5: 招待コード発行
-- ==========================================

-- 招待コード発行処理
DO $$
DECLARE
    org_id UUID;
    new_admin_code TEXT;
    new_teacher_code TEXT;
    existing_codes INTEGER;
BEGIN
    -- 組織IDを取得
    SELECT id INTO org_id FROM organizations WHERE contact_email = 'kazuyochi07@gmail.com';
    
    -- 既存の有効な招待コードをチェック
    SELECT COUNT(*) INTO existing_codes
    FROM invitation_codes 
    WHERE organization_id = org_id 
    AND used = false 
    AND expires_at > NOW();
    
    IF existing_codes = 0 THEN
        -- 管理者コード生成
        new_admin_code := 'ADMIN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 8));
        
        INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by, created_at)
        VALUES (org_id, new_admin_code, 'admin', NOW() + INTERVAL '30 days', '運営チーム', NOW());
        
        -- 講師コード生成
        new_teacher_code := 'TEACHER-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 8));
        
        INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by, created_at)
        VALUES (org_id, new_teacher_code, 'teacher', NOW() + INTERVAL '30 days', '運営チーム', NOW());
        
        RAISE NOTICE '管理者招待コード: %', new_admin_code;
        RAISE NOTICE '講師招待コード: %', new_teacher_code;
    ELSE
        RAISE NOTICE '有効な招待コードが既に存在します: % 個', existing_codes;
    END IF;
END $$;

-- Step 6: 発行された招待コード確認
SELECT '=== 発行された招待コード ===' as info;
SELECT 
    ic.code,
    ic.role,
    ic.expires_at::date as expires_date,
    CASE 
        WHEN ic.used = true THEN '❌ 使用済み'
        WHEN ic.expires_at < NOW() THEN '⏰ 期限切れ'
        ELSE '✅ 使用可能'
    END as status
FROM invitation_codes ic
JOIN organizations o ON ic.organization_id = o.id
WHERE o.contact_email = 'kazuyochi07@gmail.com'
ORDER BY ic.created_at DESC
LIMIT 5;

-- Step 7: 完了メッセージ
SELECT '🎉 アカウント準備完了！' as message;
SELECT '上記の「使用可能」な管理者招待コード（ADMIN-XXXXXXXX）をコピーして、オンボーディング画面で入力してください。' as instruction; 