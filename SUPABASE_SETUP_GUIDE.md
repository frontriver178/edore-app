# 🚀 Supabase完全設定ガイド

このガイドに従って、Edore学習管理システムをSupabaseデータベースに接続します。

## 📋 前提条件

- Node.js (v16以上)
- Git
- ブラウザ

## 🎯 ステップ1: Supabaseプロジェクトの作成

### 1.1 Supabaseアカウント作成
1. [https://supabase.com](https://supabase.com) にアクセス
2. "Start your project" をクリック
3. GitHubアカウントでサインアップ（推奨）

### 1.2 新プロジェクト作成
1. Supabaseダッシュボードで "New Project" をクリック
2. 以下を設定：
   - **Project name**: `edore-app` （任意の名前）
   - **Database Password**: 強力なパスワードを設定（保存必須）
   - **Region**: `Northeast Asia (Tokyo)` を選択
3. "Create new project" をクリック
4. プロジェクト作成完了まで待機（2-3分）

## 🔑 ステップ2: API キーとURLの取得

### 2.1 プロジェクト設定確認
1. プロジェクトダッシュボードで "Settings" → "API" をクリック
2. 以下の情報をコピー：
   ```
   Project URL: https://[your-project-id].supabase.co
   anon public key: eyJ...
   ```

### 2.2 環境変数設定
プロジェクトルートに `.env` ファイルを作成：

```bash
# .env ファイル
REACT_APP_SUPABASE_URL=https://[your-project-id].supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ[your-anon-key]
```

⚠️ **重要**: `.env` ファイルは `.gitignore` に含まれています。実際の値は絶対に公開しないでください。

## 🗄️ ステップ3: データベース初期化

### 3.1 基本スキーマの適用
1. Supabaseダッシュボードで "SQL Editor" をクリック
2. "New query" を選択
3. `database_setup.sql` ファイルの内容をコピーして貼り付け
4. "Run" をクリックして実行

### 3.2 拡張機能スキーマの適用
1. 新しいクエリを作成
2. `enhanced_student_management.sql` ファイルの内容をコピーして貼り付け
3. "Run" をクリックして実行

### 3.3 テーブル作成確認
"Table Editor" で以下のテーブルが作成されていることを確認：
- ✅ organizations
- ✅ users
- ✅ students
- ✅ student_interviews
- ✅ teaching_records
- ✅ mock_exam_results
- ✅ mock_exam_schedule
- ✅ invitation_codes

## 🔐 ステップ4: 認証設定

### 4.1 Email認証設定
1. "Authentication" → "Settings" をクリック
2. "Site URL" を設定：
   - 開発時: `http://localhost:3000`
   - 本番時: あなたのドメイン
3. "Redirect URLs" に同じURLを追加

### 4.2 Email テンプレート（オプション）
1. "Authentication" → "Email Templates" で確認メールをカスタマイズ可能
2. 日本語化したい場合は適宜変更

## 🛡️ ステップ5: セキュリティ設定確認

### 5.1 RLS (Row Level Security) 確認
- すべてのテーブルでRLSが有効になっていることを確認
- SQLファイルでポリシーが適切に設定されていることを確認

### 5.2 API設定
1. "Settings" → "API" で以下を確認：
   - 🔹 anon key: フロントエンド用（公開可能）
   - 🔑 service_role key: サーバーサイド用（秘匿必須）

## 🚀 ステップ6: アプリケーション起動

### 6.1 依存関係インストール
```bash
npm install
```

### 6.2 アプリケーション起動
```bash
npm start
```

### 6.3 接続テスト
1. ブラウザで `http://localhost:3000` にアクセス
2. ログインページの "Supabaseテストパネルを開く" をクリック
3. 接続状況を確認：
   - ✅ 接続成功
   - ✅ 全テーブル存在
   - ⏳ 認証状況

## 🧪 ステップ7: 初期データ作成

### 7.1 管理者アカウント作成
1. ログインページで "アカウント作成" をクリック
2. メールアドレスとパスワードを入力
3. 確認メールが届くので、リンクをクリック

### 7.2 組織セットアップ
1. ログイン後、組織セットアップページで塾の情報を入力
2. 管理者権限を設定

### 7.3 サンプルデータ作成（オプション）
テストパネルから "サンプルデータを作成" をクリックして、テスト用のデータを生成可能

## 🔧 トラブルシューティング

### よくある問題と解決法

#### 1. 接続エラー
```
❌ 接続失敗
```
**解決法**:
- `.env` ファイルの値を確認
- Supabaseプロジェクトが作成済みか確認
- ブラウザのキャッシュをクリア

#### 2. テーブルが見つからない
```
⚠️ 一部のテーブルが見つかりません
```
**解決法**:
- SQLファイルを再実行
- SQL Editor でエラーがないか確認
- テーブル名のスペルチェック

#### 3. 認証エラー
```
ログインに失敗しました: Invalid login credentials
```
**解決法**:
- メールアドレスとパスワードを確認
- メール認証が完了しているか確認
- Supabaseダッシュボードでユーザーが作成されているか確認

#### 4. RLSエラー
```
insufficient privileges
```
**解決法**:
- RLSポリシーを確認
- ユーザーが適切な組織に属しているか確認
- SQLファイルを再実行

## 📚 追加リソース

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [React + Supabase チュートリアル](https://supabase.com/docs/guides/getting-started/tutorials/with-react)
- [Row Level Security ガイド](https://supabase.com/docs/guides/auth/row-level-security)

## 🎉 完了！

設定が正常に完了したら、以下の機能が利用可能になります：

- 👥 生徒管理
- 🧑‍🏫 講師管理  
- 💬 生徒面談記録
- 📚 指導履歴管理
- 📊 模試結果管理
- 📱 生徒詳細ダッシュボード

何か問題が発生した場合は、テストパネルで接続状況を確認してください。 