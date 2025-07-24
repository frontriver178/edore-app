-- ==========================================
-- 招待コード発行状況確認（シンプル版）
-- ==========================================

-- 現在利用可能な招待コード一覧
SELECT 
    ic.code as "招待コード",
    ic.role as "役割",
    o.name as "組織名",
    ic.expires_at::date as "有効期限",
    CASE 
        WHEN ic.used = true THEN '❌ 使用済み'
        WHEN ic.expires_at < NOW() THEN '⏰ 期限切れ'
        ELSE '✅ 使用可能'
    END as "状態",
    ic.created_at::date as "発行日"
FROM invitation_codes ic
JOIN organizations o ON ic.organization_id = o.id
WHERE ic.used = false 
AND ic.expires_at > NOW()
ORDER BY ic.created_at DESC;

-- 発行された招待コードの総数確認
SELECT 
    COUNT(*) as "未使用招待コード数",
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as "有効な招待コード数"
FROM invitation_codes 
WHERE used = false; 