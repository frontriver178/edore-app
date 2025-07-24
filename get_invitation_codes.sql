-- ==========================================
-- 招待コード確認用クエリ
-- ==========================================

-- kazuyochi07@gmail.com の組織の招待コード確認
SELECT '=== あなたの組織の招待コード ===' as info;

SELECT 
    ic.code as "招待コード",
    ic.role as "役割",
    ic.expires_at::date as "有効期限",
    CASE 
        WHEN ic.used = true THEN '❌ 使用済み'
        WHEN ic.expires_at < NOW() THEN '⏰ 期限切れ'
        ELSE '✅ 使用可能'
    END as "状態",
    o.name as "組織名"
FROM invitation_codes ic
JOIN organizations o ON ic.organization_id = o.id
WHERE o.contact_email = 'kazuyochi07@gmail.com'
ORDER BY ic.created_at DESC;

-- すべての有効な招待コード（デバッグ用）
SELECT '=== すべての有効な招待コード ===' as info;

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
ORDER BY ic.created_at DESC
LIMIT 10;

-- 招待コードをコピーしやすい形式で表示
SELECT '=== コピー用招待コード ===' as info;
SELECT ic.code
FROM invitation_codes ic
JOIN organizations o ON ic.organization_id = o.id
WHERE o.contact_email = 'kazuyochi07@gmail.com'
AND ic.used = false 
AND ic.expires_at > NOW()
AND ic.role = 'admin'
ORDER BY ic.created_at DESC
LIMIT 1; 