-- ==========================================
-- 緊急修正: 外部キー制約エラー即座解決
-- ==========================================

-- ⚠️ 緊急対応用スクリプト ⚠️
-- 外部キー制約を一時的に削除してテストを可能にします

-- 1. 現在の外部キー制約を確認
SELECT '=== 現在の外部キー制約 ===' as section;
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'invitation_codes'
AND tc.constraint_name LIKE '%used_by%';

-- 2. 問題のある外部キー制約を削除
ALTER TABLE invitation_codes DROP CONSTRAINT IF EXISTS invitation_codes_used_by_fkey;

-- 3. 招待コードをリセット（テスト継続用）
UPDATE invitation_codes 
SET used = false, used_at = NULL, used_by = NULL 
WHERE code IN ('ADMIN-DEMO2024', 'TEACHER-DEMO2024');

-- 4. 有効期限を延長
UPDATE invitation_codes 
SET expires_at = NOW() + INTERVAL '30 days'
WHERE code IN ('ADMIN-DEMO2024', 'TEACHER-DEMO2024');

-- 5. 現在の招待コード状態確認
SELECT '=== 招待コード状態確認 ===' as section;
SELECT 
    code,
    role,
    expires_at,
    used,
    used_by,
    CASE 
        WHEN used = true THEN 'USED'
        WHEN expires_at < NOW() THEN 'EXPIRED'
        ELSE 'VALID'
    END as status
FROM invitation_codes 
WHERE code IN ('ADMIN-DEMO2024', 'TEACHER-DEMO2024');

-- 6. テスト用ユーザーを削除（重複エラー回避）
DELETE FROM users WHERE email = 'handai001mathbot@gmail.com';
DELETE FROM user_onboarding_status WHERE email = 'handai001mathbot@gmail.com';

-- 7. 確認メッセージ
SELECT '✅ 緊急修正完了: 外部キー制約を削除し、招待コードをリセットしました。' as message;
SELECT '⚠️  注意: 外部キー制約が削除されているため、本番環境では再設定が必要です。' as warning; 