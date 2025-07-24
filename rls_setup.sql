-- usersテーブルのRLSを再度有効化し、安全なポリシーを設定

-- RLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーをクリア
DROP POLICY IF EXISTS "Users can access their organization data" ON users;
DROP POLICY IF EXISTS "Users can insert their own record" ON users;
DROP POLICY IF EXISTS "Users can select their organization data" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;

-- 新しい安全なポリシーを設定

-- 1. 自分自身のレコードのINSERT許可
CREATE POLICY "Users can insert their own record" ON users
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- 2. 自分の組織のユーザーのSELECT許可
CREATE POLICY "Users can select their organization data" ON users
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        OR id = auth.uid()  -- 自分自身は常にSELECT可能
    );

-- 3. 自分自身のレコードのUPDATE許可
CREATE POLICY "Users can update their own record" ON users
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 4. 管理者は自分の組織のユーザーを削除可能
CREATE POLICY "Admins can delete organization users" ON users
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    ); 