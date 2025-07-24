-- カリキュラム初期データ（オリジナル参考書ルート）

DO $$
DECLARE
  v_basic_route_id UUID;
  v_comprehensive_route_id UUID;
  textbooks_has_name BOOLEAN;
  textbooks_has_title BOOLEAN;
  name_column TEXT;
BEGIN
  -- textbooksテーブルのname/titleカラムの存在を確認
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'textbooks' AND column_name = 'name'
  ) INTO textbooks_has_name;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'textbooks' AND column_name = 'title'
  ) INTO textbooks_has_title;
  
  -- 適切なカラム名を決定
  IF textbooks_has_name THEN
    name_column := 'name';
  ELSIF textbooks_has_title THEN
    name_column := 'title';
  ELSE
    RAISE EXCEPTION 'textbooksテーブルにnameまたはtitleカラムが存在しません';
  END IF;
  
  -- 基礎重視ルート（数学）
  INSERT INTO textbook_routes (school_name, subject, subject_detail, level)
  VALUES ('基礎重視ルート', '数学', '数学IA・IIB', 3)
  RETURNING id INTO v_basic_route_id;
  
  -- 基礎重視ルート（数学）参考書
  EXECUTE format('
    INSERT INTO textbooks (
      route_id, %I, publisher, estimated_weeks, prerequisite_level, target_level, 
      subject, subject_detail, order_index, difficulty_level, grade_level,
      min_score_rate, max_score_rate, target_score_rate
    )
    VALUES 
      ($1, ''やさしい高校数学 数学I・A'', ''学研プラス'', 4, 1, 2, ''数学'', ''数学IA'', 1, ''basic'', 10, 0, 60, 60),
      ($1, ''基礎問題精講 数学I・A'', ''旺文社'', 6, 2, 3, ''数学'', ''数学IA'', 2, ''standard'', 11, 60, 75, 75),
      ($1, ''標準問題精講 数学I・A'', ''旺文社'', 8, 3, 4, ''数学'', ''数学IA'', 3, ''advanced'', 12, 75, 90, 85),
      ($1, ''やさしい高校数学 数学II・B'', ''学研プラス'', 4, 1, 2, ''数学'', ''数学IIB'', 4, ''basic'', 11, 0, 60, 60),
      ($1, ''基礎問題精講 数学II・B'', ''旺文社'', 6, 2, 3, ''数学'', ''数学IIB'', 5, ''standard'', 12, 60, 75, 75),
      ($1, ''標準問題精講 数学II・B'', ''旺文社'', 8, 3, 4, ''数学'', ''数学IIB'', 6, ''advanced'', 12, 75, 90, 85)
  ', name_column) USING v_basic_route_id;
  
  -- 単語強化ルート（英語）
  INSERT INTO textbook_routes (school_name, subject, subject_detail, level)
  VALUES ('単語強化ルート', '英語', '英語全般', 3)
  RETURNING id INTO v_basic_route_id;
  
  -- 単語強化ルート（英語）参考書
  EXECUTE format('
    INSERT INTO textbooks (
      route_id, %I, publisher, estimated_weeks, prerequisite_level, target_level, 
      subject, subject_detail, order_index, difficulty_level, grade_level,
      min_score_rate, max_score_rate, target_score_rate
    )
    VALUES 
      ($1, ''システム英単語Basic'', ''駿台文庫'', 8, 1, 2, ''英語'', ''英単語'', 1, ''basic'', 10, 0, 60, 60),
      ($1, ''システム英単語'', ''駿台文庫'', 12, 2, 4, ''英語'', ''英単語'', 2, ''standard'', 11, 60, 85, 80),
      ($1, ''Next Stage'', ''桐原書店'', 8, 2, 3, ''英語'', ''英文法'', 3, ''standard'', 11, 60, 75, 75),
      ($1, ''英語長文レベル別問題集3'', ''東進ブックス'', 4, 2, 3, ''英語'', ''英語長文'', 4, ''standard'', 11, 60, 75, 70),
      ($1, ''英語長文レベル別問題集4'', ''東進ブックス'', 4, 3, 3, ''英語'', ''英語長文'', 5, ''standard'', 11, 70, 80, 75),
      ($1, ''英語長文レベル別問題集5'', ''東進ブックス'', 4, 3, 4, ''英語'', ''英語長文'', 6, ''advanced'', 12, 75, 90, 85)
  ', name_column) USING v_basic_route_id;
  
  -- 読解重視ルート（現代文）
  INSERT INTO textbook_routes (school_name, subject, subject_detail, level)
  VALUES ('読解重視ルート', '国語', '現代文', 3)
  RETURNING id INTO v_basic_route_id;
  
  -- 読解重視ルート（現代文）参考書
  EXECUTE format('
    INSERT INTO textbooks (
      route_id, %I, publisher, estimated_weeks, prerequisite_level, target_level, 
      subject, subject_detail, order_index, difficulty_level, grade_level,
      min_score_rate, max_score_rate, target_score_rate
    )
    VALUES 
      ($1, ''田村のやさしく語る現代文'', ''代々木ライブラリー'', 4, 1, 2, ''国語'', ''現代文'', 1, ''basic'', 10, 0, 60, 60),
      ($1, ''現代文読解力の開発講座'', ''駿台文庫'', 8, 2, 4, ''国語'', ''現代文'', 2, ''advanced'', 12, 60, 90, 80),
      ($1, ''現代文と格闘する'', ''河合出版'', 6, 3, 5, ''国語'', ''現代文'', 3, ''advanced'', 12, 75, 95, 90)
  ', name_column) USING v_basic_route_id;
  
  -- 網羅重視ルート（数学）
  INSERT INTO textbook_routes (school_name, subject, subject_detail, level)
  VALUES ('網羅重視ルート', '数学', '数学IA・IIB', 3)
  RETURNING id INTO v_comprehensive_route_id;
  
  -- 網羅重視ルート（数学）参考書
  EXECUTE format('
    INSERT INTO textbooks (
      route_id, %I, publisher, estimated_weeks, prerequisite_level, target_level, 
      subject, subject_detail, order_index, difficulty_level, grade_level,
      min_score_rate, max_score_rate, target_score_rate
    )
    VALUES 
      ($1, ''チャート式基礎からの数学I+A'', ''数研出版'', 8, 1, 3, ''数学'', ''数学IA'', 1, ''standard'', 11, 0, 75, 70),
      ($1, ''チャート式基礎からの数学II+B'', ''数研出版'', 8, 1, 3, ''数学'', ''数学IIB'', 2, ''standard'', 12, 0, 75, 70),
      ($1, ''文系数学の良問プラチカ'', ''河合出版'', 6, 3, 4, ''数学'', ''数学IA・IIB'', 3, ''advanced'', 12, 75, 90, 85)
  ', name_column) USING v_comprehensive_route_id;
  
  -- 長文重視ルート（英語）
  INSERT INTO textbook_routes (school_name, subject, subject_detail, level)
  VALUES ('長文重視ルート', '英語', '英語全般', 3)
  RETURNING id INTO v_comprehensive_route_id;
  
  -- 長文重視ルート（英語）参考書
  EXECUTE format('
    INSERT INTO textbooks (
      route_id, %I, publisher, estimated_weeks, prerequisite_level, target_level, 
      subject, subject_detail, order_index, difficulty_level, grade_level,
      min_score_rate, max_score_rate, target_score_rate
    )
    VALUES 
      ($1, ''英単語ターゲット1900'', ''旺文社'', 12, 2, 4, ''英語'', ''英単語'', 1, ''standard'', 11, 60, 85, 80),
      ($1, ''やっておきたい英語長文300'', ''河合出版'', 4, 2, 3, ''英語'', ''英語長文'', 2, ''standard'', 11, 60, 75, 70),
      ($1, ''やっておきたい英語長文500'', ''河合出版'', 4, 3, 4, ''英語'', ''英語長文'', 3, ''advanced'', 12, 75, 85, 80),
      ($1, ''やっておきたい英語長文700'', ''河合出版'', 4, 4, 5, ''英語'', ''英語長文'', 4, ''advanced'', 12, 85, 95, 90)
  ', name_column) USING v_basic_route_id;
  
  RAISE NOTICE 'オリジナル参考書ルートの初期データ投入が完了しました（カラム名: %）', name_column;
END $$;