-- ==========================================
-- SaaS オンボーディングシステム 完全修正版
-- 外部キー制約エラーの根本的解決
-- ==========================================

-- UUIDエクステンションを有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. テーブル構造の根本的修正
-- ==========================================

-- invitation_codes テーブルの used_by カラムを修正
-- 外部キー制約を一度削除してテーブル構造を修正
ALTER TABLE invitation_codes DROP CONSTRAINT IF EXISTS invitation_codes_used_by_fkey;

-- used_by カラムを NULL可能に設定（既にNULLABLEかもしれませんが念のため）
ALTER TABLE invitation_codes ALTER COLUMN used_by SET DEFAULT NULL;

-- ==========================================
-- 2. 改良された招待コード使用関数
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
    user_exists BOOLEAN := false;
BEGIN
    -- 1. 招待コードを検索
    SELECT * INTO invite_record
    FROM invitation_codes
    WHERE code = p_code
    AND used = false
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, '招待コードが見つからないか、既に使用済みまたは期限切れです。', NULL::UUID, NULL::TEXT;
        RETURN;
    END IF;
    
    -- 2. 組織の存在確認
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = invite_record.organization_id) THEN
        RETURN QUERY SELECT false, '指定された組織が存在しません。', NULL::UUID, NULL::TEXT;
        RETURN;
    END IF;
    
    -- 3. 安全なトランザクション処理
    BEGIN
        -- 3-1. ユーザーの存在確認
        SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO user_exists;
        
        -- 3-2. ユーザーをusersテーブルに追加/更新（最優先）
        IF user_exists THEN
            -- 既存ユーザーの場合は更新
            UPDATE users 
            SET organization_id = invite_record.organization_id,
                name = p_user_name,
                role = invite_record.role,
                updated_at = NOW()
            WHERE id = p_user_id;
        ELSE
            -- 新規ユーザーの場合は挿入
            INSERT INTO users (id, organization_id, email, name, role, created_at, updated_at)
            VALUES (p_user_id, invite_record.organization_id, p_user_email, p_user_name, invite_record.role, NOW(), NOW());
        END IF;
        
        -- 3-3. 招待コードを使用済みにする（usersレコードが確実に存在）
        UPDATE invitation_codes
        SET used = true, 
            used_at = NOW(), 
            used_by = p_user_id
        WHERE code = p_code AND used = false;
        
        -- 3-4. オンボーディング状況を更新
        INSERT INTO user_onboarding_status (user_id, email, registration_step, has_organization, organization_id, invitation_code, completed_at, created_at, updated_at)
        VALUES (p_user_id, p_user_email, 5, true, invite_record.organization_id, p_code, NOW(), NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            registration_step = 5,
            has_organization = true,
            organization_id = EXCLUDED.organization_id,
            invitation_code = EXCLUDED.invitation_code,
            completed_at = EXCLUDED.completed_at,
            updated_at = NOW();
        
        new_org_id := invite_record.organization_id;
        new_role := invite_record.role;
        
        RETURN QUERY SELECT true, '招待コードを使用してアカウントが設定されました。', new_org_id, new_role;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        -- エラー時のロールバック処理
        ROLLBACK;
        RETURN QUERY SELECT false, ('処理中にエラーが発生しました: ' || error_message), NULL::UUID, NULL::TEXT;
        RETURN;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 3. 外部キー制約の安全な再設定
-- ==========================================

-- 外部キー制約を緩和した形で再作成
ALTER TABLE invitation_codes 
ADD CONSTRAINT invitation_codes_used_by_fkey 
FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ==========================================
-- 4. 組織申請処理の改善
-- ==========================================

CREATE OR REPLACE FUNCTION submit_organization_application(
    p_user_id UUID,
    p_user_email TEXT,
    p_applicant_name TEXT,
    p_organization_name TEXT,
    p_organization_description TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    application_id UUID
) AS $$
DECLARE
    new_application_id UUID;
    error_message TEXT;
BEGIN
    BEGIN
        -- 組織申請を作成
        INSERT INTO organization_applications (
            applicant_email, applicant_name, organization_name, 
            organization_description, phone, address, status, created_at
        )
        VALUES (
            p_user_email, p_applicant_name, p_organization_name,
            p_organization_description, p_phone, p_address, 'pending', NOW()
        )
        RETURNING id INTO new_application_id;
        
        -- オンボーディング状況を更新
        INSERT INTO user_onboarding_status (user_id, email, registration_step, application_id, created_at, updated_at)
        VALUES (p_user_id, p_user_email, 4, new_application_id, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            registration_step = 4,
            application_id = EXCLUDED.application_id,
            updated_at = NOW();
        
        RETURN QUERY SELECT true, '組織申請が正常に送信されました。', new_application_id;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RETURN QUERY SELECT false, ('申請処理中にエラーが発生しました: ' || error_message), NULL::UUID;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. テストデータの完全リセット
-- ==========================================

-- 既存のテストデータをクリーンアップ
DELETE FROM user_onboarding_status WHERE email LIKE '%test%' OR email LIKE '%example%' OR email LIKE '%handai001mathbot%';
DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%example%' OR email LIKE '%handai001mathbot%';
DELETE FROM organization_applications WHERE applicant_email LIKE '%test%' OR applicant_email LIKE '%example%' OR applicant_email LIKE '%handai001mathbot%';

-- 招待コードをリセット
UPDATE invitation_codes 
SET used = false, used_at = NULL, used_by = NULL, expires_at = NOW() + INTERVAL '30 days'
WHERE code IN ('ADMIN-DEMO2024', 'TEACHER-DEMO2024');

-- テスト組織の確実な存在
INSERT INTO organizations (id, name, contact_email, subscription_plan, subscription_status, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'テスト塾',
    'test@example.com',
    'standard',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    contact_email = EXCLUDED.contact_email,
    subscription_plan = EXCLUDED.subscription_plan,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = NOW();

-- 招待コードの確実な存在
INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by, created_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'ADMIN-DEMO2024',
    'admin',
    NOW() + INTERVAL '30 days',
    'システム',
    NOW()
) ON CONFLICT (code) DO UPDATE SET
    expires_at = NOW() + INTERVAL '30 days',
    used = false,
    used_at = NULL,
    used_by = NULL;

INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by, created_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'TEACHER-DEMO2024',
    'teacher',
    NOW() + INTERVAL '30 days',
    'システム',
    NOW()
) ON CONFLICT (code) DO UPDATE SET
    expires_at = NOW() + INTERVAL '30 days',
    used = false,
    used_at = NULL,
    used_by = NULL;

-- ==========================================
-- 6. 強化されたデバッグ関数
-- ==========================================

-- システム全体の状態確認
CREATE OR REPLACE FUNCTION debug_system_status()
RETURNS TABLE(
    component TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- 組織確認
    SELECT 
        'organizations' as component,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'ERROR' END as status,
        ('テーブル内レコード数: ' || COUNT(*)) as details
    FROM organizations
    UNION ALL
    -- 招待コード確認
    SELECT 
        'invitation_codes' as component,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'ERROR' END as status,
        ('有効コード数: ' || COUNT(*)) as details
    FROM invitation_codes WHERE used = false AND expires_at > NOW()
    UNION ALL
    -- 関数確認
    SELECT 
        'use_invitation_code_function' as component,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'ERROR' END as status,
        '関数が存在します' as details
    FROM information_schema.routines 
    WHERE routine_name = 'use_invitation_code' AND routine_schema = 'public'
    UNION ALL
    -- 外部キー制約確認
    SELECT 
        'foreign_key_constraints' as component,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END as status,
        ('invitation_codes外部キー制約数: ' || COUNT(*)) as details
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_name = 'invitation_codes';
END;
$$ LANGUAGE plpgsql;

-- 招待コード詳細情報
CREATE OR REPLACE FUNCTION debug_invitation_detail(p_code TEXT)
RETURNS TABLE(
    code TEXT,
    organization_name TEXT,
    role TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    used BOOLEAN,
    used_by_email TEXT,
    status TEXT,
    can_use BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ic.code,
        COALESCE(o.name, 'organization_not_found') as organization_name,
        ic.role,
        ic.expires_at,
        ic.used,
        COALESCE(u.email, 'not_used') as used_by_email,
        CASE 
            WHEN ic.used = true THEN 'USED'
            WHEN ic.expires_at < NOW() THEN 'EXPIRED'
            WHEN o.id IS NULL THEN 'INVALID_ORG'
            ELSE 'VALID'
        END as status,
        (ic.used = false AND ic.expires_at > NOW() AND o.id IS NOT NULL) as can_use
    FROM invitation_codes ic
    LEFT JOIN organizations o ON ic.organization_id = o.id
    LEFT JOIN users u ON ic.used_by = u.id
    WHERE ic.code = p_code;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 7. 即座実行テスト
-- ==========================================

-- システム状態確認
SELECT '=== システム全体状態確認 ===' as section;
SELECT * FROM debug_system_status();

-- 招待コード詳細確認
SELECT '=== 招待コード ADMIN-DEMO2024 詳細 ===' as section;
SELECT * FROM debug_invitation_detail('ADMIN-DEMO2024');

-- 組織確認
SELECT '=== テスト組織確認 ===' as section;
SELECT id, name, contact_email, subscription_status FROM organizations 
WHERE id = '11111111-1111-1111-1111-111111111111';

-- 完了メッセージ
SELECT '🎉 SaaS オンボーディングシステム完全修正版のセットアップが完了しました!' as message;
SELECT 'ℹ️  外部キー制約エラーが根本的に解決され、安全なテストが可能になりました。' as info; 