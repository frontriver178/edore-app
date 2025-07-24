# 講師ログイン機能 実装計画書

## 実装概要

要件定義書に基づき、講師ログイン機能の具体的な実装手順を定義する。

## 前提条件

### 現在の実装状況
- ✅ 基本的な管理者・生徒管理機能
- ✅ 講師管理機能（管理者による講師CRUD）
- ✅ Supabase認証基盤
- ✅ RoleBasedAccess コンポーネント

### 必要な拡張
- 🔲 講師専用認証フロー
- 🔲 講師-生徒の関連管理
- 🔲 講師専用ダッシュボード
- 🔲 データアクセス制御の強化

## フェーズ1: 基本認証機能（3日間）

### Day 1: データベース設計・実装

#### 1.1 teacher_students テーブル作成
```sql
-- 講師-生徒関連テーブル
CREATE TABLE teacher_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, student_id, subject)
);

-- RLS有効化
ALTER TABLE teacher_students ENABLE ROW LEVEL SECURITY;

-- インデックス作成
CREATE INDEX idx_teacher_students_teacher ON teacher_students(teacher_id);
CREATE INDEX idx_teacher_students_student ON teacher_students(student_id);
CREATE INDEX idx_teacher_students_org ON teacher_students(organization_id);
```

#### 1.2 RLSポリシー実装
```sql
-- 講師は自分が担当する生徒のみアクセス可能
CREATE POLICY teacher_view_assigned_students ON students
FOR ALL TO authenticated
USING (
  -- 管理者は全てアクセス可能
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
  OR
  -- 講師は担当生徒のみアクセス可能
  EXISTS (
    SELECT 1 FROM teacher_students ts
    WHERE ts.student_id = students.id
    AND ts.teacher_id = auth.uid()
    AND ts.is_active = true
  )
);
```

### Day 2: 講師招待・認証機能

#### 2.1 講師招待機能の実装
**ファイル**: `src/services/teacherInviteService.js`

#### 2.2 講師ログインページ作成
**ファイル**: `src/pages/TeacherLogin.jsx`

### Day 3: 基本的な講師ダッシュボード

#### 3.1 講師ダッシュボード作成
**ファイル**: `src/pages/TeacherDashboard.jsx`

## フェーズ2: 記録管理機能（4日間）

### Day 4-5: 指導記録管理
### Day 6-7: 面談記録管理

## フェーズ3: 高度な機能（3日間）

### Day 8-9: スケジュール管理
### Day 10: 通知・レポート機能

## 実装優先度

### 高優先度（必須機能）
1. 講師認証・ログイン機能
2. 担当生徒管理
3. 基本的な記録入力

### 中優先度（重要機能）
1. スケジュール管理
2. 検索・フィルタ機能
3. 通知機能

### 低優先度（将来機能）
1. 高度なレポート
2. AI分析機能
3. 外部連携

## 次のステップ

1. **データベース設計の確認・実装**
2. **講師招待機能の実装**
3. **段階的な機能追加**

---

**作成日**: 2025年7月18日