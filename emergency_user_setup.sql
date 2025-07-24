-- ==========================================
-- 緊急ユーザーアカウント作成・招待コード発行
-- ==========================================

-- 現在のユーザーの情報確認
SELECT '=== 現在のユーザー確認 ===' as section;
SELECT 
    id,
    email,
    CASE 
        WHEN id IS NOT NULL THEN '認証済み'
        ELSE '未認証'
    END as auth_status
FROM auth.users 
WHERE email LIKE '%@%'  -- 実際のメールアドレスに置き換え
ORDER BY created_at DESC 
LIMIT 5;

-- ==========================================
-- 方法1: 既存ユーザーの組織作成
-- ==========================================

-- 実際のメールアドレスに置き換えて実行
-- SELECT * FROM admin_create_organization(
--     'テスト塾',                         -- 塾名
--     'ユーザーの実際のメールアドレス',    -- 連絡先（認証済みメールと同じ）
--     '000-0000-0000',                   -- 電話番号
--     '東京都渋谷区1-1-1',                -- 住所
--     'basic',                           -- プラン
--     '緊急対応'                         -- 作成者
-- );

-- ==========================================
-- 方法2: 招待コード緊急発行
-- ==========================================

-- 既存組織に招待コード発行（組織IDを確認後実行）
-- SELECT * FROM admin_create_invitation_code(
--     '11111111-1111-1111-1111-111111111111'::UUID,  -- 既存組織ID
--     'admin',                           -- 役割
--     7,                                 -- 有効期限（短期）
--     '緊急対応',                        -- 作成者
--     'EMERGENCY-USER-2024'              -- カスタムコード
-- );

-- ==========================================
-- 確認クエリ
-- ==========================================

-- 組織一覧確認
SELECT '=== 利用可能な組織 ===' as section;
SELECT 
    id,
    name,
    contact_email,
    subscription_status
FROM organizations 
WHERE subscription_status = 'active'
ORDER BY created_at DESC;

-- 有効な招待コード確認
SELECT '=== 有効な招待コード ===' as section;
SELECT 
    code,
    role,
    expires_at,
    CASE 
        WHEN expires_at > NOW() THEN '✅ 有効'
        ELSE '❌ 期限切れ'
    END as status
FROM invitation_codes 
WHERE used = false
ORDER BY created_at DESC
LIMIT 10;

-- 使用方法
SELECT '=== 次のステップ ===' as section;
SELECT '1. 上記の組織IDを確認' as step_1;
SELECT '2. admin_create_invitation_code関数で招待コード発行' as step_2;
SELECT '3. ユーザーに招待コードを提供' as step_3;
SELECT '4. オンボーディング画面で招待コード入力' as step_4; 