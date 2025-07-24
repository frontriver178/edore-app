-- Supabaseダッシュボードで実行するSQL --
INSERT INTO users (id, organization_id, email, name, role) VALUES 
('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'kazuyochi07@gmail.com', '管理者ユーザー', 'admin')
ON CONFLICT (email) DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role;
