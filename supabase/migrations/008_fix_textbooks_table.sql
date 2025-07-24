-- textbooksテーブルの構造を修正

-- 既存のtextbooksテーブルに必要なカラムを追加
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS route_id UUID;
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS publisher TEXT;
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS prerequisite_level INTEGER;
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS target_level INTEGER;
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS subject_detail TEXT;
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS order_index INTEGER;
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 制約を追加（既存の場合はエラーを無視）
DO $$
BEGIN
    -- route_idの外部キー制約を追加
    BEGIN
        ALTER TABLE textbooks ADD CONSTRAINT fk_textbooks_route_id 
        FOREIGN KEY (route_id) REFERENCES textbook_routes(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN
        -- 既に存在する場合は無視
    END;
    
    -- prerequisite_levelのチェック制約を追加
    BEGIN
        ALTER TABLE textbooks ADD CONSTRAINT chk_textbooks_prerequisite_level 
        CHECK (prerequisite_level BETWEEN 1 AND 5);
    EXCEPTION WHEN duplicate_object THEN
        -- 既に存在する場合は無視
    END;
    
    -- target_levelのチェック制約を追加
    BEGIN
        ALTER TABLE textbooks ADD CONSTRAINT chk_textbooks_target_level 
        CHECK (target_level BETWEEN 1 AND 5);
    EXCEPTION WHEN duplicate_object THEN
        -- 既に存在する場合は無視
    END;
END $$;