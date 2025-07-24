-- ==========================================
-- SaaS オンボーディングシステム（修正版）
-- アカウント管理・組織作成・招待機能
-- ==========================================

-- UUIDエクステンションを有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. 招待コードテーブル（新規追加）
-- ==========================================

CREATE TABLE IF NOT EXISTS invitation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by TEXT, -- 運営担当者名など
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_organization ON invitation_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_expires ON invitation_codes(expires_at);

-- RLS設定
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- 招待コードのRLSポリシー（開発用に緩和）
DROP POLICY IF EXISTS "Anyone can read unused invitation codes" ON invitation_codes;
CREATE POLICY "Anyone can read unused invitation codes" ON invitation_codes
    FOR SELECT
    USING (true); -- 開発用に緩和

DROP POLICY IF EXISTS "Anyone can update invitation codes for registration" ON invitation_codes;
CREATE POLICY "Anyone can update invitation codes for registration" ON invitation_codes
    FOR UPDATE
    USING (true); -- 開発用に緩和

-- ==========================================
-- 2. 組織申請テーブル（新規追加）
-- ==========================================

CREATE TABLE IF NOT EXISTS organization_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_email TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    organization_name TEXT NOT NULL,
    organization_description TEXT,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_org_applications_email ON organization_applications(applicant_email);
CREATE INDEX IF NOT EXISTS idx_org_applications_status ON organization_applications(status);

-- RLS設定
ALTER TABLE organization_applications ENABLE ROW LEVEL SECURITY;

-- 申請のRLSポリシー（開発用に緩和）
DROP POLICY IF EXISTS "Users can create organization applications" ON organization_applications;
CREATE POLICY "Users can create organization applications" ON organization_applications
    FOR INSERT
    WITH CHECK (true); -- 開発用に緩和

DROP POLICY IF EXISTS "Users can view their own applications" ON organization_applications;
CREATE POLICY "Users can view their own applications" ON organization_applications
    FOR SELECT
    USING (true); -- 開発用に緩和

-- ==========================================
-- 3. ユーザー登録状況テーブル（新規追加）
-- ==========================================

CREATE TABLE IF NOT EXISTS user_onboarding_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    email TEXT NOT NULL,
    registration_step INTEGER DEFAULT 1 CHECK (registration_step BETWEEN 1 AND 5),
    -- 1: アカウント作成, 2: 組織選択, 3: ユーザー情報入力, 4: 招待コード/申請, 5: 完了
    has_organization BOOLEAN DEFAULT false,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    invitation_code TEXT,
    application_id UUID REFERENCES organization_applications(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_email ON user_onboarding_status(email);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_step ON user_onboarding_status(registration_step);

-- RLS設定
ALTER TABLE user_onboarding_status ENABLE ROW LEVEL SECURITY;

-- オンボーディングのRLSポリシー（開発用に緩和）
DROP POLICY IF EXISTS "Users can manage their own onboarding status" ON user_onboarding_status;
CREATE POLICY "Users can manage their own onboarding status" ON user_onboarding_status
    FOR ALL
    USING (true); -- 開発用に緩和

-- ==========================================
-- 4. 便利関数の作成（修正版）
-- ==========================================

-- 新規ユーザーのオンボーディング開始
CREATE OR REPLACE FUNCTION start_user_onboarding(
    p_user_id UUID,
    p_email TEXT
) RETURNS UUID AS $$
DECLARE
    onboarding_id UUID;
BEGIN
    INSERT INTO user_onboarding_status (user_id, email, registration_step)
    VALUES (p_user_id, p_email, 1)
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW()
    RETURNING id INTO onboarding_id;
    
    RETURN onboarding_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 招待コード検証と使用（修正版）
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
    
    -- トランザクション内で処理
    BEGIN
        -- 招待コードを使用済みにする
        UPDATE invitation_codes
        SET used = true, used_at = NOW(), used_by = p_user_id
        WHERE code = p_code;
        
        -- ユーザーをusersテーブルに追加
        INSERT INTO users (id, organization_id, email, name, role)
        VALUES (p_user_id, invite_record.organization_id, p_user_email, p_user_name, invite_record.role)
        ON CONFLICT (id) DO UPDATE SET
            organization_id = EXCLUDED.organization_id,
            name = EXCLUDED.name,
            role = EXCLUDED.role;
        
        -- オンボーディング状況を更新
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
-- 5. サンプル組織とテストデータの作成
-- ==========================================

-- テスト組織の作成（存在しない場合のみ）
INSERT INTO organizations (id, name, contact_email, subscription_plan, subscription_status)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'テスト塾',
    'test@example.com',
    'standard',
    'active'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    contact_email = EXCLUDED.contact_email,
    subscription_plan = EXCLUDED.subscription_plan,
    subscription_status = EXCLUDED.subscription_status;

-- 既存のサンプル組織用の管理者招待コード
INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'ADMIN-DEMO2024',
    'admin',
    NOW() + INTERVAL '30 days',
    'システム'
) ON CONFLICT (code) DO UPDATE SET
    expires_at = NOW() + INTERVAL '30 days',
    used = false,
    used_at = NULL,
    used_by = NULL;

-- 既存のサンプル組織用の講師招待コード
INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'TEACHER-DEMO2024',
    'teacher',
    NOW() + INTERVAL '30 days',
    'システム'
) ON CONFLICT (code) DO UPDATE SET
    expires_at = NOW() + INTERVAL '30 days',
    used = false,
    used_at = NULL,
    used_by = NULL;

-- ==========================================
-- 6. 運営用管理関数
-- ==========================================

-- 新規組織と管理者コードを作成
CREATE OR REPLACE FUNCTION create_organization_with_admin_code(
    p_org_name TEXT,
    p_org_email TEXT DEFAULT NULL,
    p_org_phone TEXT DEFAULT NULL,
    p_org_address TEXT DEFAULT NULL,
    p_plan TEXT DEFAULT 'basic',
    p_created_by TEXT DEFAULT 'システム'
) RETURNS TABLE(
    organization_id UUID,
    admin_code TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    new_org_id UUID;
    new_code TEXT;
    expiry TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 組織を作成
    INSERT INTO organizations (name, contact_email, subscription_plan)
    VALUES (p_org_name, p_org_email, p_plan)
    RETURNING id INTO new_org_id;
    
    -- 管理者コードを生成
    new_code := 'ADMIN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
    expiry := NOW() + INTERVAL '30 days';
    
    INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by)
    VALUES (new_org_id, new_code, 'admin', expiry, p_created_by);
    
    RETURN QUERY SELECT new_org_id, new_code, expiry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 7. 確認用ビュー
-- ==========================================

-- 組織の招待コード一覧
CREATE OR REPLACE VIEW organization_invitation_codes AS
SELECT 
    o.name as organization_name,
    ic.code,
    ic.role,
    ic.expires_at,
    ic.used,
    ic.used_at,
    u.name as used_by_name,
    ic.created_by
FROM invitation_codes ic
JOIN organizations o ON ic.organization_id = o.id
LEFT JOIN users u ON ic.used_by = u.id
ORDER BY ic.created_at DESC;

-- ユーザーのオンボーディング状況
CREATE OR REPLACE VIEW user_onboarding_overview AS
SELECT 
    uos.email,
    uos.registration_step,
    uos.has_organization,
    o.name as organization_name,
    uos.invitation_code,
    oa.organization_name as applied_organization,
    oa.status as application_status,
    uos.completed_at,
    uos.created_at
FROM user_onboarding_status uos
LEFT JOIN organizations o ON uos.organization_id = o.id
LEFT JOIN organization_applications oa ON uos.application_id = oa.id
ORDER BY uos.created_at DESC;

-- ==========================================
-- 8. デバッグ用関数
-- ==========================================

-- システム状態確認
CREATE OR REPLACE FUNCTION check_system_status()
RETURNS TABLE(
    table_name TEXT,
    record_count BIGINT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'organizations'::TEXT, COUNT(*), 'OK'::TEXT FROM organizations
    UNION ALL
    SELECT 'invitation_codes'::TEXT, COUNT(*), 'OK'::TEXT FROM invitation_codes
    UNION ALL
    SELECT 'organization_applications'::TEXT, COUNT(*), 'OK'::TEXT FROM organization_applications
    UNION ALL
    SELECT 'user_onboarding_status'::TEXT, COUNT(*), 'OK'::TEXT FROM user_onboarding_status
    UNION ALL
    SELECT 'users'::TEXT, COUNT(*), 'OK'::TEXT FROM users;
END;
$$ LANGUAGE plpgsql;

-- 招待コード状態確認
CREATE OR REPLACE FUNCTION check_invitation_codes()
RETURNS TABLE(
    code TEXT,
    organization_name TEXT,
    role TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    used BOOLEAN,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ic.code,
        o.name as organization_name,
        ic.role,
        ic.expires_at,
        ic.used,
        CASE 
            WHEN ic.used = true THEN 'USED'
            WHEN ic.expires_at < NOW() THEN 'EXPIRED'
            ELSE 'VALID'
        END as status
    FROM invitation_codes ic
    JOIN organizations o ON ic.organization_id = o.id
    ORDER BY ic.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 9. 実行確認
-- ==========================================

-- システム状態確認の実行
SELECT * FROM check_system_status();
SELECT * FROM check_invitation_codes();

-- 完了メッセージ
SELECT '✅ SaaSオンボーディングシステム（修正版）のセットアップが完了しました!' as message; 