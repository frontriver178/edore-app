-- ==========================================
-- テスト用管理者アカウント作成スクリプト
-- ==========================================

-- 1. 組織を作成（既存の場合はスキップ）
INSERT INTO organizations (name, contact_email, subscription_plan, subscription_status)
VALUES ('テスト学習塾', 'admin@test.com', 'basic', 'active')
RETURNING id, name;

-- 2. 作成された組織のIDを確認
SELECT id, name FROM organizations WHERE name = 'テスト学習塾';

-- 3. 管理者用招待コード作成
INSERT INTO invitation_codes (
    code,
    organization_id,
    role,
    expires_at,
    created_by
) VALUES (
    'ADMIN-TEST2025',
    (SELECT id FROM organizations WHERE name = 'テスト学習塾' ORDER BY created_at DESC LIMIT 1),
    'admin',
    NOW() + INTERVAL '30 days',
    'システム管理者'
)
RETURNING code, role, expires_at;

-- 4. 作成された招待コードの確認
SELECT 
    ic.code as "招待コード",
    ic.role as "役割",
    o.name as "組織名",
    ic.expires_at as "有効期限",
    ic.used as "使用済み"
FROM invitation_codes ic
JOIN organizations o ON ic.organization_id = o.id
WHERE ic.code = 'ADMIN-TEST2025';

-- ==========================================
-- 使用方法:
-- 1. 上記SQLを実行して招待コードを作成
-- 2. アプリの登録ページ(/register)にアクセス
-- 3. 以下の情報で登録:
--    - メールアドレス: 任意のメールアドレス
--    - パスワード: 8文字以上
--    - 招待コード: ADMIN-TEST2025
-- 4. 登録後、管理者権限で講師管理ページにアクセス可能
-- ==========================================

-- 既存のテスト用招待コードを無効化する場合
-- UPDATE invitation_codes SET used = true WHERE code LIKE 'ADMIN-TEST%';

-- 組織とその関連データを削除する場合（テスト後のクリーンアップ）
-- DELETE FROM organizations WHERE name = 'テスト学習塾';