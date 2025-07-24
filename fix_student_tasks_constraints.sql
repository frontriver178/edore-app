-- student_tasksテーブルのteacher_id制約を緩和
-- 担当講師が未定のタスクも許可するようにする

-- 1. teacher_idのNOT NULL制約を削除
ALTER TABLE student_tasks 
ALTER COLUMN teacher_id DROP NOT NULL;

-- 注意：UUID型では空文字列は保存されないため、既存データの修正は不要

-- 2. 確認：制約が削除されたことを確認
SELECT 
    column_name, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'student_tasks' 
AND column_name = 'teacher_id'; 