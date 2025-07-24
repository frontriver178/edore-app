-- ==========================================
-- 現在のアカウントのオンボーディング状態リセット
-- ==========================================

-- Step 1: kazuyochi07@gmail.com のオンボーディング状態をリセット
SELECT '=== kazuyochi07@gmail.com のリセット ===' as info;

-- usersテーブルから削除
DELETE FROM users WHERE email = 'kazuyochi07@gmail.com';

-- オンボーディング状態削除
DELETE FROM user_onboarding_status WHERE email = 'kazuyochi07@gmail.com';

-- Step 2: リセット確認
SELECT '=== リセット確認 ===' as info;

-- usersテーブル確認
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ OK - kazuyochi07@gmail.com が削除されました'
        ELSE '⚠️ WARNING - まだデータが残っています'
    END as users_status
FROM users WHERE email = 'kazuyochi07@gmail.com';

-- オンボーディング状態確認
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ OK - オンボーディング状態が削除されました'
        ELSE '⚠️ WARNING - まだオンボーディング状態が残っています'
    END as onboarding_status
FROM user_onboarding_status WHERE email = 'kazuyochi07@gmail.com';

-- Step 3: 利用可能な招待コード確認
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