-- ==========================================
-- 現在のログイン状況確認
-- ==========================================

-- Step 1: 現在のAuth.usersテーブル確認
SELECT '=== 現在のAuth.usersテーブル ===' as info;
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    CASE 
        WHEN last_sign_in_at IS NOT NULL THEN '✅ アクティブ'
        ELSE '❌ 未ログイン'
    END as status
FROM auth.users 
WHERE email IN ('kazuyochi07@gmail.com', 'handai001mathbot@gmail.com')
ORDER BY last_sign_in_at DESC NULLS LAST;

-- Step 2: 両方のアカウントのusersテーブル状態
SELECT '=== usersテーブル状態 ===' as info;
SELECT 
    email,
    name,
    organization_id,
    role,
    created_at,
    CASE 
        WHEN organization_id IS NOT NULL THEN '✅ 組織設定済み'
        ELSE '❌ 組織未設定'
    END as org_status
FROM users 
WHERE email IN ('kazuyochi07@gmail.com', 'handai001mathbot@gmail.com')
ORDER BY created_at DESC;

-- Step 3: オンボーディング状況
SELECT '=== オンボーディング状況 ===' as info;
SELECT 
    email,
    registration_step,
    has_organization,
    completed_at,
    CASE 
        WHEN completed_at IS NOT NULL THEN '✅ 完了済み'
        ELSE '🔄 未完了'
    END as completion_status
FROM user_onboarding_status 
WHERE email IN ('kazuyochi07@gmail.com', 'handai001mathbot@gmail.com')
ORDER BY created_at DESC;

-- Step 4: 問題の原因を特定
SELECT '=== 問題の原因 ===' as info;
SELECT 
    'kazuyochi07@gmail.com アカウントは既にオンボーディング完了済みです。' as issue_1,
    'handai001mathbot@gmail.com でテストする場合は、' as issue_2,
    'このアカウントでログインしてください。' as issue_3; 