-- ==========================================
-- 運営側での組織管理用SQLスクリプト
-- ==========================================

-- 1. 新規塾（組織）の作成
-- 営業担当が契約後に実行
INSERT INTO organizations (name, email, phone, address, subscription_plan, subscription_status) 
VALUES (
  '○○進学塾',                    -- 塾名
  'contact@example-juku.com',     -- 連絡先メール
  '03-1234-5678',                 -- 電話番号
  '東京都渋谷区○○1-2-3',         -- 住所
  'standard',                     -- プラン（basic/standard/premium）
  'active'                        -- ステータス
) RETURNING id, name;

-- 2. 管理者コードの生成（初回セットアップ用）
-- 上記で作成された組織IDを使用
INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by)
VALUES (
  '組織ID（上記のRETURNING結果）',  -- 組織ID
  'ADMIN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6)),  -- ランダムコード生成
  'admin',                        -- 管理者権限
  NOW() + INTERVAL '30 days',     -- 30日間有効
  '運営担当者名'                  -- 作成者
) RETURNING code, expires_at;

-- ==========================================
-- 管理用クエリ
-- ==========================================

-- 組織一覧の確認
SELECT 
  id,
  name,
  email,
  subscription_plan,
  subscription_status,
  created_at
FROM organizations 
ORDER BY created_at DESC;

-- 管理者コードの確認
SELECT 
  ic.code,
  ic.role,
  ic.expires_at,
  ic.used,
  ic.used_at,
  ic.created_by,
  o.name as organization_name
FROM invitation_codes ic
JOIN organizations o ON ic.organization_id = o.id
ORDER BY ic.created_at DESC;

-- 使用済み管理者コードの確認
SELECT 
  ic.code,
  ic.role,
  ic.used_at,
  u.name as used_by_name,
  u.email as used_by_email,
  o.name as organization_name
FROM invitation_codes ic
JOIN organizations o ON ic.organization_id = o.id
LEFT JOIN users u ON ic.used_by = u.id
WHERE ic.used = TRUE
ORDER BY ic.used_at DESC;

-- 期限切れ管理者コードのクリーンアップ
DELETE FROM invitation_codes 
WHERE expires_at < NOW() AND used = FALSE;

-- ==========================================
-- 緊急時の操作
-- ==========================================

-- 管理者コードの無効化
UPDATE invitation_codes 
SET used = TRUE, used_at = NOW()
WHERE code = '無効化したいコード';

-- 新しい管理者コードの緊急発行
INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by)
VALUES (
  '組織ID',
  'EMERGENCY-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6)),
  'admin',
  NOW() + INTERVAL '7 days', -- 短期間有効
  '緊急対応者名'
) RETURNING code, expires_at; 