-- カリキュラム初期データ（シンプル版）

DO $$
DECLARE
  v_takeda_route_id UUID;
  v_kawai_route_id UUID;
BEGIN
  -- 武田塾数学ルート
  INSERT INTO textbook_routes (school_name, subject, subject_detail, level)
  VALUES ('武田塾', '数学', '数学IA・IIB', 3)
  RETURNING id INTO v_takeda_route_id;
  
  -- 武田塾数学参考書
  INSERT INTO textbooks (route_id, name, publisher, duration, prerequisite_level, target_level, subject, subject_detail, order_index)
  VALUES 
    (v_takeda_route_id, 'やさしい高校数学 数学I・A', '学研プラス', 4, 1, 2, '数学', '数学IA', 1),
    (v_takeda_route_id, '基礎問題精講 数学I・A', '旺文社', 6, 2, 3, '数学', '数学IA', 2),
    (v_takeda_route_id, '標準問題精講 数学I・A', '旺文社', 8, 3, 4, '数学', '数学IA', 3),
    (v_takeda_route_id, 'やさしい高校数学 数学II・B', '学研プラス', 4, 1, 2, '数学', '数学IIB', 4),
    (v_takeda_route_id, '基礎問題精講 数学II・B', '旺文社', 6, 2, 3, '数学', '数学IIB', 5),
    (v_takeda_route_id, '標準問題精講 数学II・B', '旺文社', 8, 3, 4, '数学', '数学IIB', 6);
  
  -- 武田塾英語ルート
  INSERT INTO textbook_routes (school_name, subject, subject_detail, level)
  VALUES ('武田塾', '英語', '英語全般', 3)
  RETURNING id INTO v_takeda_route_id;
  
  -- 武田塾英語参考書
  INSERT INTO textbooks (route_id, name, publisher, duration, prerequisite_level, target_level, subject, subject_detail, order_index)
  VALUES 
    (v_takeda_route_id, 'システム英単語Basic', '駿台文庫', 8, 1, 2, '英語', '英単語', 1),
    (v_takeda_route_id, 'システム英単語', '駿台文庫', 12, 2, 4, '英語', '英単語', 2),
    (v_takeda_route_id, 'Next Stage', '桐原書店', 8, 2, 3, '英語', '英文法', 3),
    (v_takeda_route_id, '英語長文レベル別問題集3', '東進ブックス', 4, 2, 3, '英語', '英語長文', 4),
    (v_takeda_route_id, '英語長文レベル別問題集4', '東進ブックス', 4, 3, 3, '英語', '英語長文', 5),
    (v_takeda_route_id, '英語長文レベル別問題集5', '東進ブックス', 4, 3, 4, '英語', '英語長文', 6);
  
  -- 武田塾現代文ルート
  INSERT INTO textbook_routes (school_name, subject, subject_detail, level)
  VALUES ('武田塾', '国語', '現代文', 3)
  RETURNING id INTO v_takeda_route_id;
  
  -- 武田塾現代文参考書
  INSERT INTO textbooks (route_id, name, publisher, duration, prerequisite_level, target_level, subject, subject_detail, order_index)
  VALUES 
    (v_takeda_route_id, '田村のやさしく語る現代文', '代々木ライブラリー', 4, 1, 2, '国語', '現代文', 1),
    (v_takeda_route_id, '現代文読解力の開発講座', '駿台文庫', 8, 2, 4, '国語', '現代文', 2),
    (v_takeda_route_id, '現代文と格闘する', '河合出版', 6, 3, 5, '国語', '現代文', 3);
  
  -- 河合塾数学ルート
  INSERT INTO textbook_routes (school_name, subject, subject_detail, level)
  VALUES ('河合塾', '数学', '数学IA・IIB', 3)
  RETURNING id INTO v_kawai_route_id;
  
  -- 河合塾数学参考書
  INSERT INTO textbooks (route_id, name, publisher, duration, prerequisite_level, target_level, subject, subject_detail, order_index)
  VALUES 
    (v_kawai_route_id, 'チャート式基礎からの数学I+A', '数研出版', 8, 1, 3, '数学', '数学IA', 1),
    (v_kawai_route_id, 'チャート式基礎からの数学II+B', '数研出版', 8, 1, 3, '数学', '数学IIB', 2),
    (v_kawai_route_id, '文系数学の良問プラチカ', '河合出版', 6, 3, 4, '数学', '数学IA・IIB', 3);
  
  -- 河合塾英語ルート
  INSERT INTO textbook_routes (school_name, subject, subject_detail, level)
  VALUES ('河合塾', '英語', '英語全般', 3)
  RETURNING id INTO v_kawai_route_id;
  
  -- 河合塾英語参考書
  INSERT INTO textbooks (route_id, name, publisher, duration, prerequisite_level, target_level, subject, subject_detail, order_index)
  VALUES 
    (v_kawai_route_id, '英単語ターゲット1900', '旺文社', 12, 2, 4, '英語', '英単語', 1),
    (v_kawai_route_id, 'やっておきたい英語長文300', '河合出版', 4, 2, 3, '英語', '英語長文', 2),
    (v_kawai_route_id, 'やっておきたい英語長文500', '河合出版', 4, 3, 4, '英語', '英語長文', 3),
    (v_kawai_route_id, 'やっておきたい英語長文700', '河合出版', 4, 4, 5, '英語', '英語長文', 4);
    
END $$;