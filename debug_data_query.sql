-- Supabaseの既存データを確認するためのクエリ

-- 1. 組織一覧を確認
SELECT id, name, created_at 
FROM organizations 
ORDER BY created_at DESC;

-- 2. 生徒データを確認
SELECT 
  id, 
  organization_id, 
  name, 
  grade, 
  status,
  created_at
FROM students 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. 指導記録を確認
SELECT 
  id,
  organization_id,
  student_id,
  teacher_id,
  lesson_date,
  subject,
  created_at
FROM teaching_records 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. 面談記録を確認
SELECT 
  id,
  organization_id,
  student_id,
  teacher_id,
  interview_date,
  created_at
FROM interview_records 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. usersテーブルを確認
SELECT 
  id,
  organization_id,
  role,
  name,
  email,
  created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 10;

-- 6. 現在使用中のorganization_idと一致するデータの確認
-- (コンソールで確認したorganization_idに置き換えてください)
SELECT 'students' as table_name, COUNT(*) as count 
FROM students 
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'teaching_records', COUNT(*) 
FROM teaching_records 
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'interview_records', COUNT(*) 
FROM interview_records 
WHERE organization_id = '11111111-1111-1111-1111-111111111111';