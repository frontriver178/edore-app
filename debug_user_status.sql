-- ==========================================
-- 現在のユーザー状態デバッグ
-- ==========================================

-- Step 1: usersテーブルの状態
SELECT '=== usersテーブル確認 ===' as info;
SELECT 
    id,
    email,
    name,
    organization_id,
    role,
    created_at
FROM users 
WHERE email = 'handai001mathbot@gmail.com';

-- Step 2: user_onboarding_statusテーブルの状態
SELECT '=== user_onboarding_statusテーブル確認 ===' as info;
SELECT 
    user_id,
    email,
    registration_step,
    has_organization,
    organization_id,
    invitation_code,
    completed_at,
    created_at
FROM user_onboarding_status 
WHERE email = 'handai001mathbot@gmail.com';

-- Step 3: Auth.usersテーブルの確認（Supabase認証）
SELECT '=== Auth.usersテーブル確認 ===' as info;
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'handai001mathbot@gmail.com';

-- Step 4: 利用可能な招待コード
SELECT '=== 利用可能な招待コード ===' as info;
SELECT 
    ic.code,
    ic.role,
    o.name as organization_name,
    ic.expires_at::date as expires_date,
    ic.used,
    ic.created_at
FROM invitation_codes ic
JOIN organizations o ON ic.organization_id = o.id
WHERE ic.used = false 
AND ic.expires_at > NOW()
ORDER BY ic.created_at DESC;

-- Step 5: 完全クリーンアップ（必要に応じて）
SELECT '=== 完全クリーンアップ実行 ===' as info;

-- すべてのテーブルから該当ユーザーを削除
DELETE FROM users WHERE email = 'handai001mathbot@gmail.com';
DELETE FROM user_onboarding_status WHERE email = 'handai001mathbot@gmail.com'; 