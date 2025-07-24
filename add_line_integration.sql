-- LINE連携機能のためのデータベーススキーマ追加
-- 実行前にデータベースのバックアップを取ることを推奨

-- 1. usersテーブルにLINE関連カラムを追加
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS line_display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS line_notification_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS line_linked_at TIMESTAMP WITH TIME ZONE;

-- 2. studentsテーブルにLINE関連カラムを追加
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS line_display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS line_notification_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS line_linked_at TIMESTAMP WITH TIME ZONE;

-- 3. LINE通知ログテーブルを作成
CREATE TABLE IF NOT EXISTS line_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('user', 'student')),
  recipient_id UUID NOT NULL,
  line_user_id VARCHAR(255),
  notification_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. LINE通知設定テーブルを作成
CREATE TABLE IF NOT EXISTS line_notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  template TEXT,
  schedule_time TIME,
  days_before INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, notification_type)
);

-- 5. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id) WHERE line_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_line_user_id ON students(line_user_id) WHERE line_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_line_notifications_recipient ON line_notifications(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_line_notifications_status ON line_notifications(status, created_at);
CREATE INDEX IF NOT EXISTS idx_line_notifications_org ON line_notifications(organization_id, created_at);

-- 6. RLS (Row Level Security) ポリシーの設定
ALTER TABLE line_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_notification_settings ENABLE ROW LEVEL SECURITY;

-- 7. line_notifications テーブルのRLSポリシー
CREATE POLICY "Users can view their organization's LINE notifications"
  ON line_notifications FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert LINE notifications for their organization"
  ON line_notifications FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update LINE notifications for their organization"
  ON line_notifications FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- 8. line_notification_settings テーブルのRLSポリシー
CREATE POLICY "Users can view their organization's LINE notification settings"
  ON line_notification_settings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage LINE notification settings"
  ON line_notification_settings FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 9. デフォルトの通知設定を挿入
INSERT INTO line_notification_settings (organization_id, notification_type, enabled, template, days_before)
SELECT 
  id as organization_id,
  unnest(ARRAY['login', 'task_deadline', 'class_schedule', 'interview_schedule']) as notification_type,
  true as enabled,
  CASE 
    WHEN unnest(ARRAY['login', 'task_deadline', 'class_schedule', 'interview_schedule']) = 'login' 
    THEN '🔐 {{user_name}}さんがログインしました（{{login_time}}）'
    WHEN unnest(ARRAY['login', 'task_deadline', 'class_schedule', 'interview_schedule']) = 'task_deadline' 
    THEN '📋 タスク「{{task_title}}」の期限が近づいています（期限: {{due_date}}）'
    WHEN unnest(ARRAY['login', 'task_deadline', 'class_schedule', 'interview_schedule']) = 'class_schedule' 
    THEN '📚 授業予定: {{date}} {{time}} - {{subject}}（講師: {{teacher_name}}）'
    WHEN unnest(ARRAY['login', 'task_deadline', 'class_schedule', 'interview_schedule']) = 'interview_schedule' 
    THEN '🗣️ 面談予定: {{date}} {{time}}（{{purpose}}）'
  END as template,
  CASE 
    WHEN unnest(ARRAY['login', 'task_deadline', 'class_schedule', 'interview_schedule']) = 'task_deadline' THEN 1
    WHEN unnest(ARRAY['login', 'task_deadline', 'class_schedule', 'interview_schedule']) = 'class_schedule' THEN 1
    WHEN unnest(ARRAY['login', 'task_deadline', 'class_schedule', 'interview_schedule']) = 'interview_schedule' THEN 1
    ELSE 0
  END as days_before
FROM organizations
ON CONFLICT (organization_id, notification_type) DO NOTHING;

-- 10. 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. 更新日時トリガーの設定
CREATE TRIGGER update_line_notifications_updated_at
    BEFORE UPDATE ON line_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_line_notification_settings_updated_at
    BEFORE UPDATE ON line_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 12. 確認用クエリ
SELECT 'LINE integration tables created successfully' as result;

-- 確認: 追加されたカラムを表示
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name LIKE 'line_%';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' AND column_name LIKE 'line_%';

-- 確認: 新しいテーブルを表示
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('line_notifications', 'line_notification_settings');