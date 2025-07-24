-- 指導スケジュールテーブルの作成
CREATE TABLE teaching_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject VARCHAR(100) NOT NULL,
  topic TEXT,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_teaching_schedules_organization ON teaching_schedules(organization_id);
CREATE INDEX idx_teaching_schedules_student ON teaching_schedules(student_id);
CREATE INDEX idx_teaching_schedules_teacher ON teaching_schedules(teacher_id);
CREATE INDEX idx_teaching_schedules_date ON teaching_schedules(scheduled_date);
CREATE INDEX idx_teaching_schedules_status ON teaching_schedules(status);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_teaching_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_teaching_schedules_updated_at
  BEFORE UPDATE ON teaching_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_teaching_schedules_updated_at();

-- サンプルデータの挿入
INSERT INTO teaching_schedules (organization_id, student_id, teacher_id, scheduled_date, start_time, end_time, subject, topic, status, notes) VALUES
('11111111-1111-1111-1111-111111111111', 
 (SELECT id FROM students WHERE name = '田中太郎' LIMIT 1),
 (SELECT id FROM users WHERE email = 'kazuyochi07@gmail.com' LIMIT 1),
 '2024-12-16', '16:00', '17:30', '数学', '二次関数の応用問題', 'scheduled', '基礎から丁寧に説明'),

('11111111-1111-1111-1111-111111111111',
 (SELECT id FROM students WHERE name = '佐藤花子' LIMIT 1),
 (SELECT id FROM users WHERE email = 'kazuyochi07@gmail.com' LIMIT 1),
 '2024-12-17', '18:00', '19:30', '英語', '長文読解', 'scheduled', '語彙力強化も重点的に'),

('11111111-1111-1111-1111-111111111111',
 (SELECT id FROM students WHERE name = '鈴木次郎' LIMIT 1),
 (SELECT id FROM users WHERE email = 'kazuyochi07@gmail.com' LIMIT 1),
 '2024-12-18', '19:00', '20:30', '化学', '酸化還元反応', 'scheduled', '実験映像も使用予定'); 