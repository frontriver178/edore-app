-- カリキュラム初期データ（柔軟版）

DO $$
DECLARE
  v_takeda_route_id UUID;
  v_kawai_route_id UUID;
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
  
  -- 武田塾数学ルート
  INSERT INTO textbook_routes (school_name, subject, subject_detail, level)
  VALUES ('武田塾', '数学', '数学IA・IIB', 3)
  RETURNING id INTO v_takeda_route_id;
  
  -- 武田塾数学参考書（動的にカラム名を使用）
  EXECUTE format('
    INSERT INTO textbooks (route_id, %I, publisher, duration, prerequisite_level, target_level, subject, subject_detail, order_index)
    VALUES 
      ($1, ''やさしい高校数学 数学I・A'', ''学研プラス'', 4, 1, 2, ''数学'', ''数学IA'', 1),
      ($1, ''基礎問題精講 数学I・A'', ''旺文社'', 6, 2, 3, ''数学'', ''数学IA'', 2),
      ($1, ''標準問題精講 数学I・A'', ''旺文社'', 8, 3, 4, ''数学'', ''数学IA'', 3),
      ($1, ''やさしい高校数学 数学II・B'', ''学研プラス'', 4, 1, 2, ''数学'', ''数学IIB'', 4),
      ($1, ''基礎問題精講 数学II・B'', ''旺文社'', 6, 2, 3, ''数学'', ''数学IIB'', 5),
      ($1, ''標準問題精講 数学II・B'', ''旺文社'', 8, 3, 4, ''数学'', ''数学IIB'', 6)
  ', name_column) USING v_takeda_route_id;
  
  -- 武田塾英語ルート
  INSERT INTO textbook_routes (school_name, subject, subject_detail, level)
  VALUES ('武田塾', '英語', '英語全般', 3)
  RETURNING id INTO v_takeda_route_id;
  
  -- 武田塾英語参考書
  EXECUTE format('
    INSERT INTO textbooks (route_id, %I, publisher, duration, prerequisite_level, target_level, subject, subject_detail, order_index)
    VALUES 
      ($1, ''システム英単語Basic'', ''駿台文庫'', 8, 1, 2, ''英語'', ''英単語'', 1),
      ($1, ''システム英単語'', ''駿台文庫'', 12, 2, 4, ''英語'', ''英単語'', 2),
      ($1, ''Next Stage'', ''桐原書店'', 8, 2, 3, ''英語'', ''英文法'', 3),
      ($1, ''英語長文レベル別問題集3'', ''東進ブックス'', 4, 2, 3, ''英語'', ''英語長文'', 4),
      ($1, ''英語長文レベル別問題集4'', ''東進ブックス'', 4, 3, 3, ''英語'', ''英語長文'', 5),
      ($1, ''英語長文レベル別問題集5'', ''東進ブックス'', 4, 3, 4, ''英語'', ''英語長文'', 6)
  ', name_column) USING v_takeda_route_id;
  
  -- 武田塾現代文ルート
  INSERT INTO textbook_routes (school_name, subject, subject_detail, level)
  VALUES ('武田塾', '国語', '現代文', 3)
  RETURNING id INTO v_takeda_route_id;
  
  -- 武田塾現代文参考書
  EXECUTE format('
    INSERT INTO textbooks (route_id, %I, publisher, duration, prerequisite_level, target_level, subject, subject_detail, order_index)
    VALUES 
      ($1, ''田村のやさしく語る現代文'', ''代々木ライブラリー'', 4, 1, 2, ''国語'', ''現代文'', 1),
      ($1, ''現代文読解力の開発講座'', ''駿台文庫'', 8, 2, 4, ''国語'', ''現代文'', 2),
      ($1, ''現代文と格闘する'', ''河合出版'', 6, 3, 5, ''国語'', ''現代文'', 3)
  ', name_column) USING v_takeda_route_id;
  
  -- 河合塾数学ルート
  INSERT INTO textbook_routes (school_name, subject, subject_detail, level)
  VALUES ('河合塾', '数学', '数学IA・IIB', 3)
  RETURNING id INTO v_kawai_route_id;
  
  -- 河合塾数学参考書
  EXECUTE format('
    INSERT INTO textbooks (route_id, %I, publisher, duration, prerequisite_level, target_level, subject, subject_detail, order_index)
    VALUES 
      ($1, ''チャート式基礎からの数学I+A'', ''数研出版'', 8, 1, 3, ''数学'', ''数学IA'', 1),
      ($1, ''チャート式基礎からの数学II+B'', ''数研出版'', 8, 1, 3, ''数学'', ''数学IIB'', 2),
      ($1, ''文系数学の良問プラチカ'', ''河合出版'', 6, 3, 4, ''数学'', ''数学IA・IIB'', 3)
  ', name_column) USING v_kawai_route_id;
  
  -- 河合塾英語ルート
  INSERT INTO textbook_routes (school_name, subject, subject_detail, level)
  VALUES ('河合塾', '英語', '英語全般', 3)
  RETURNING id INTO v_kawai_route_id;
  
  -- 河合塾英語参考書
  EXECUTE format('
    INSERT INTO textbooks (route_id, %I, publisher, duration, prerequisite_level, target_level, subject, subject_detail, order_index)
    VALUES 
      ($1, ''英単語ターゲット1900'', ''旺文社'', 12, 2, 4, ''英語'', ''英単語'', 1),
      ($1, ''やっておきたい英語長文300'', ''河合出版'', 4, 2, 3, ''英語'', ''英語長文'', 2),
      ($1, ''やっておきたい英語長文500'', ''河合出版'', 4, 3, 4, ''英語'', ''英語長文'', 3),
      ($1, ''やっておきたい英語長文700'', ''河合出版'', 4, 4, 5, ''英語'', ''英語長文'', 4)
  ', name_column) USING v_kawai_route_id;
  
  RAISE NOTICE 'カリキュラム初期データの投入が完了しました（カラム名: %）', name_column;
END $$;