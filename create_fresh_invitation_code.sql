-- ==========================================
-- 新しい招待コード発行 & 完全リセット
-- ==========================================

-- Step 1: オンボーディング状態を完全にリセット
DELETE FROM user_onboarding_status 
WHERE email = 'handai001mathbot@gmail.com';

-- Step 2: 新しい招待コードを発行
INSERT INTO invitation_codes (
    organization_id, 
    code, 
    role, 
    expires_at, 
    created_by, 
    created_at
)
SELECT 
    o.id as organization_id,
    'ADMIN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 8)) as code,
    'admin' as role,
    NOW() + INTERVAL '30 days' as expires_at,
    'システム管理者' as created_by,
    NOW() as created_at
FROM organizations o
WHERE o.contact_email = 'kazuyochi07@gmail.com'
AND o.subscription_status = 'active'
RETURNING 
    code as "✅ 新しい招待コード", 
    expires_at::date as "有効期限",
    'この招待コードをコピーしてください' as "メモ";

-- Step 3: リセット完了確認
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ OK - オンボーディングデータが削除されました'
        ELSE '⚠️ WARNING - まだオンボーディングデータが残っています'
    END as "オンボーディング状態",
    COUNT(*) as "残りレコード数"
FROM user_onboarding_status 
WHERE email = 'handai001mathbot@gmail.com';

-- Step 4: 新しい招待コードを確認
SELECT 
    ic.code as "招待コード",
    ic.role as "役割",
    o.name as "組織名",
    ic.expires_at::date as "有効期限",
    '✅ 未使用' as "状態"
FROM invitation_codes ic
JOIN organizations o ON ic.organization_id = o.id
WHERE ic.used = false 
AND ic.expires_at > NOW()
ORDER BY ic.created_at DESC
LIMIT 1; 