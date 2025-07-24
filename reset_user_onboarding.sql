-- ==========================================
-- ユーザーオンボーディング状態リセット
-- ==========================================

-- Step 1: 現在の状態確認
SELECT '=== 現在のユーザー状態確認 ===' as info;

-- usersテーブルの状態確認
SELECT 
    'users' as table_name,
    id, 
    email, 
    name, 
    organization_id,
    role
FROM users 
WHERE email = 'handai001mathbot@gmail.com';

-- オンボーディング状態確認
SELECT 
    'user_onboarding_status' as table_name,
    user_id,
    email,
    registration_step,
    has_organization,
    completed_at
FROM user_onboarding_status 
WHERE email = 'handai001mathbot@gmail.com';

-- Step 2: オンボーディング状態をリセット
SELECT '=== オンボーディング状態リセット ===' as info;

-- usersテーブルから削除
DELETE FROM users 
WHERE email = 'handai001mathbot@gmail.com';

-- user_onboarding_statusテーブルから削除
DELETE FROM user_onboarding_status 
WHERE email = 'handai001mathbot@gmail.com';

-- Step 3: リセット完了確認
SELECT '=== リセット完了確認 ===' as info;

-- usersテーブル確認
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'OK - ユーザーデータが削除されました'
        ELSE 'WARNING - まだユーザーデータが残っています'
    END as users_status,
    COUNT(*) as remaining_records
FROM users 
WHERE email = 'handai001mathbot@gmail.com';

-- オンボーディング状態確認
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'OK - オンボーディングデータが削除されました'
        ELSE 'WARNING - まだオンボーディングデータが残っています'
    END as onboarding_status,
    COUNT(*) as remaining_records
FROM user_onboarding_status 
WHERE email = 'handai001mathbot@gmail.com';

-- Step 4: 利用可能な招待コード確認
SELECT '=== 利用可能な招待コード ===' as info;

SELECT 
    ic.code as "招待コード",
    ic.role as "役割",
    o.name as "組織名",
    ic.expires_at::date as "有効期限"
FROM invitation_codes ic
JOIN organizations o ON ic.organization_id = o.id
WHERE ic.used = false 
AND ic.expires_at > NOW()
ORDER BY ic.created_at DESC; 