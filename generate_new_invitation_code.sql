-- ==========================================
-- 新しい招待コード発行（シンプル版）
-- ==========================================

-- 直接招待コードを発行
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
RETURNING code as "新しい招待コード", expires_at::date as "有効期限";

-- 発行された招待コードを確認
SELECT 
    ic.code as "招待コード",
    ic.role as "役割",
    o.name as "組織名",
    ic.expires_at::date as "有効期限"
FROM invitation_codes ic
JOIN organizations o ON ic.organization_id = o.id
WHERE ic.used = false 
AND ic.expires_at > NOW()
ORDER BY ic.created_at DESC
LIMIT 5; 