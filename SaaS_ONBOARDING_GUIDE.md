# 🚀 Edore SaaS オンボーディングシステム 修正版ガイド

## 🔧 修正された問題点

### 1. **PostgreSQL関数のエラーハンドリング修正**
- `use_invitation_code`関数のEXCEPTION処理を修正
- 詳細なエラーメッセージを返すように改善

### 2. **RLSポリシーの緩和**
- 開発環境でのテストを容易にするため、一時的にRLSポリシーを緩和
- 本番環境では適切な権限制御に戻す必要あり

### 3. **フロントエンドのエラーハンドリング強化**
- 詳細なエラーメッセージとログ出力
- デバッグパネルの追加
- ユーザーフィードバックの改善

### 4. **テストデータの修正**
- 招待コードの有効期限延長
- 使用済み状態のリセット

## 📋 実行手順

### Step 1: データベースセットアップ

```sql
-- 1. Supabaseダッシュボードで SQL Editor を開く
-- 2. 以下の順番でSQLファイルを実行

-- ❗️ 重要: 既存のデータがある場合は、先にバックアップを取ってください
```

**実行順序:**
1. **`saas_onboarding_system_fixed.sql`** - 修正版のオンボーディングシステム
2. **`database_test_script.sql`** - 動作確認テスト

### Step 2: 動作確認

SQL実行後、以下のテスト結果を確認してください：

**✅ 確認すべき項目:**
- システム状態確認で各テーブルにレコードが存在する
- 招待コード `ADMIN-DEMO2024` が `VALID` 状態
- 関数 `use_invitation_code` が存在する
- 組織 `テスト塾` が存在する

### Step 3: フロントエンドテスト

1. **新しいアカウントでサインアップ**
   ```
   - 使用していないメールアドレスで登録
   - メール認証を完了
   ```

2. **オンボーディングページでのテスト**
   ```
   - 自動的に /onboarding に遷移することを確認
   - デバッグパネルを開いて情報を確認
   - 招待コード「ADMIN-DEMO2024」を入力
   - 名前を入力して「参加する」をクリック
   ```

3. **エラーが発生した場合**
   - デバッグパネルで詳細情報を確認
   - ブラウザのコンソールログを確認
   - 下記のトラブルシューティングを参照

## 🔍 トラブルシューティング

### Problem 1: 「関数が存在しません」エラー

**原因:** SQLスクリプトが正しく実行されていない

**解決策:**
```sql
-- 関数の存在確認
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name IN ('use_invitation_code', 'start_user_onboarding');

-- 存在しない場合は saas_onboarding_system_fixed.sql を再実行
```

### Problem 2: 「テーブルが存在しません」エラー

**原因:** テーブルが作成されていない

**解決策:**
```sql
-- テーブルの存在確認
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('invitation_codes', 'organization_applications', 'user_onboarding_status');

-- 存在しない場合は saas_onboarding_system_fixed.sql を再実行
```

### Problem 3: 「招待コードが無効です」エラー

**原因:** 招待コードが作成されていない、または期限切れ

**解決策:**
```sql
-- 招待コードの状態確認
SELECT * FROM check_invitation_codes();

-- 新しい招待コードを作成
INSERT INTO invitation_codes (organization_id, code, role, expires_at, created_by)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'ADMIN-TEST2024',
    'admin',
    NOW() + INTERVAL '7 days',
    'テスト'
);
```

### Problem 4: RLS（行レベルセキュリティ）エラー

**原因:** RLSポリシーが厳しすぎる

**解決策:**
```sql
-- 一時的にRLSを無効化（開発環境のみ）
ALTER TABLE invitation_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding_status DISABLE ROW LEVEL SECURITY;

-- テスト完了後に再度有効化
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding_status ENABLE ROW LEVEL SECURITY;
```

## 🧪 テストケース

### テストケース1: 招待コードでの参加

```
1. 新しいメールアドレスでサインアップ
2. メール認証完了
3. 自動的にオンボーディングページに遷移
4. 「招待コードで参加」を選択
5. 招待コード「ADMIN-DEMO2024」を入力
6. 名前を入力
7. 「参加する」をクリック
8. 成功メッセージが表示される
9. 生徒管理ページにリダイレクト
```

**期待される結果:**
- エラーなしで完了
- `users` テーブルに新しいレコードが追加される
- 生徒管理ページにアクセス可能

### テストケース2: 新規組織申請

```
1. 別の新しいメールアドレスでサインアップ
2. 「新しい塾を登録」を選択
3. 組織情報を入力
4. 申請を送信
5. 申請完了ページが表示される
```

**期待される結果:**
- `organization_applications` テーブルに新しいレコードが追加される
- 申請完了ページが表示される

### テストケース3: 既存ユーザーのアクセス

```
1. 既に `users` テーブルに存在するユーザーでログイン
2. 直接生徒管理ページにアクセス
```

**期待される結果:**
- オンボーディングページに遷移しない
- 直接生徒管理ページにアクセス可能

## 📊 デバッグ情報の見方

### システム状態確認

```json
{
  "table_name": "invitation_codes",
  "record_count": 2,
  "status": "OK"
}
```

### 招待コード状態確認

```json
{
  "code": "ADMIN-DEMO2024",
  "organization_name": "テスト塾",
  "role": "admin",
  "expires_at": "2024-12-25T00:00:00Z",
  "used": false,
  "status": "VALID"
}
```

## 🔄 システムリセット方法

テストデータをリセットする場合：

```sql
-- 招待コードをリセット
UPDATE invitation_codes 
SET used = false, used_at = NULL, used_by = NULL 
WHERE code IN ('ADMIN-DEMO2024', 'TEACHER-DEMO2024');

-- テストユーザーを削除
DELETE FROM users 
WHERE email LIKE '%test%' OR email LIKE '%example%';

-- オンボーディング状況をリセット
DELETE FROM user_onboarding_status 
WHERE email LIKE '%test%' OR email LIKE '%example%';

-- 組織申請をクリア
DELETE FROM organization_applications 
WHERE applicant_email LIKE '%test%' OR applicant_email LIKE '%example%';
```

## 🚀 次のステップ

システムが正常に動作することを確認できたら：

1. **本番環境への適用**
   - RLSポリシーを適切に設定
   - セキュリティの強化

2. **管理機能の追加**
   - 組織申請の承認/拒否UI
   - 招待コード管理画面
   - 利用状況ダッシュボード

3. **メール通知機能**
   - 申請受理確認メール
   - 招待コード送信メール
   - 承認通知メール

## 📞 サポート

問題が解決しない場合は、以下の情報を含めてお知らせください：

1. **エラーメッセージ**（完全なメッセージ）
2. **ブラウザのコンソールログ**
3. **データベースのテスト結果**（`database_test_script.sql`の実行結果）
4. **デバッグパネルの情報**

---

## 🎯 重要なポイント

- **データベースのバックアップ** - 実行前に必ずバックアップを取る
- **段階的テスト** - 一つずつ機能を確認する
- **ログの確認** - エラーが発生した場合は詳細ログを確認する
- **権限の確認** - RLSポリシーが適切に設定されているか確認する

このガイドに従って実行すれば、SaaSオンボーディングシステムが正常に動作するはずです。 