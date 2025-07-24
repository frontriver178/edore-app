-- ==========================================
-- SaaS オンボーディングシステム（修正版v2）
-- 外部キー制約エラー修正版
-- ==========================================

-- UUIDエクステンションを有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 招待コード検証と使用（修正版v2 - 外部キー制約修正）
-- ==========================================

CREATE OR REPLACE FUNCTION use_invitation_code(
    p_code TEXT,
    p_user_id UUID,
    p_user_email TEXT,
    p_user_name TEXT
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    organization_id UUID,
    role TEXT
) AS $$
DECLARE
    invite_record RECORD;
    new_org_id UUID;
    new_role TEXT;
    error_message TEXT;
BEGIN
    -- 招待コードを検索
    SELECT * INTO invite_record
    FROM invitation_codes
    WHERE code = p_code
    AND used = false
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, '招待コードが見つからないか、既に使用済みまたは期限切れです。', NULL::UUID, NULL::TEXT;
        RETURN;
    END IF;
    
    -- トランザクション内で処理（順序変更）
    BEGIN
        -- 1. まずユーザーをusersテーブルに追加（外部キー制約の参照先を先に作成）
        INSERT INTO users (id, organization_id, email, name, role)
        VALUES (p_user_id, invite_record.organization_id, p_user_email, p_user_name, invite_record.role)
        ON CONFLICT (id) DO UPDATE SET
            organization_id = EXCLUDED.organization_id,
            name = EXCLUDED.name,
            role = EXCLUDED.role;
        
        -- 2. 次に招待コードを使用済みにする（usersレコードが存在するので安全）
        UPDATE invitation_codes
        SET used = true, used_at = NOW(), used_by = p_user_id
        WHERE code = p_code;
        
        -- 3. オンボーディング状況を更新
        UPDATE user_onboarding_status
        SET registration_step = 5,
            has_organization = true,
            organization_id = invite_record.organization_id,
            invitation_code = p_code,
            completed_at = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        new_org_id := invite_record.organization_id;
        new_role := invite_record.role;
        
        RETURN QUERY SELECT true, '招待コードを使用してアカウントが設定されました。', new_org_id, new_role;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RETURN QUERY SELECT false, ('エラーが発生しました: ' || error_message), NULL::UUID, NULL::TEXT;
        RETURN;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 外部キー制約を一時的に緩和（デバッグ用）
-- ==========================================

-- invitation_codes テーブルの used_by 外部キー制約を一時的に削除
ALTER TABLE invitation_codes DROP CONSTRAINT IF EXISTS invitation_codes_used_by_fkey;

-- 外部キー制約を再作成（CASCADE削除で緩和）
ALTER TABLE invitation_codes 
ADD CONSTRAINT invitation_codes_used_by_fkey 
FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL;

-- ==========================================
-- テストデータのリセット
-- ==========================================

-- 招待コードをリセット（テスト用）
UPDATE invitation_codes 
SET used = false, used_at = NULL, used_by = NULL 
WHERE code IN ('ADMIN-DEMO2024', 'TEACHER-DEMO2024');

-- 招待コードの有効期限を延長
UPDATE invitation_codes 
SET expires_at = NOW() + INTERVAL '30 days'
WHERE code IN ('ADMIN-DEMO2024', 'TEACHER-DEMO2024');

-- ==========================================
-- デバッグ用関数の更新
-- ==========================================

-- 招待コード詳細確認関数
CREATE OR REPLACE FUNCTION debug_invitation_code(p_code TEXT)
RETURNS TABLE(
    code TEXT,
    organization_id UUID,
    organization_name TEXT,
    role TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    used BOOLEAN,
    used_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ic.code,
        ic.organization_id,
        o.name as organization_name,
        ic.role,
        ic.expires_at,
        ic.used,
        ic.used_by,
        ic.created_at,
        CASE 
            WHEN ic.used = true THEN 'USED'
            WHEN ic.expires_at < NOW() THEN 'EXPIRED'
            ELSE 'VALID'
        END as status
    FROM invitation_codes ic
    LEFT JOIN organizations o ON ic.organization_id = o.id
    WHERE ic.code = p_code;
END;
$$ LANGUAGE plpgsql;

-- ユーザー存在確認関数
CREATE OR REPLACE FUNCTION debug_user_exists(p_user_id UUID)
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    name TEXT,
    organization_id UUID,
    role TEXT,
    exists_in_users BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name,
        u.organization_id,
        u.role,
        true as exists_in_users
    FROM users u
    WHERE u.id = p_user_id
    UNION ALL
    SELECT 
        p_user_id,
        NULL::TEXT,
        NULL::TEXT,
        NULL::UUID,
        NULL::TEXT,
        false as exists_in_users
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 即座に実行するテスト
-- ==========================================

-- 招待コード ADMIN-DEMO2024 の詳細確認
SELECT '=== 招待コード詳細確認 ===' as section;
SELECT * FROM debug_invitation_code('ADMIN-DEMO2024');

-- テスト組織の存在確認
SELECT '=== テスト組織確認 ===' as section;
SELECT id, name, contact_email FROM organizations WHERE id = '11111111-1111-1111-1111-111111111111';

-- 完了メッセージ
SELECT '✅ SaaSオンボーディングシステム（修正版v2）外部キー制約エラー修正完了!' as message; 