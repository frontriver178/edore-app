# デモアカウント情報

## 作成予定のデモアカウント

### 1. 管理者アカウント
- **Email**: demo-admin@edore.com
- **Password**: demo123456
- **Name**: デモ管理者
- **Role**: admin
- **Organization ID**: demo-org-001

### 2. 講師アカウント
- **Email**: demo-teacher@edore.com
- **Password**: demo123456
- **Name**: デモ講師
- **Role**: teacher
- **Organization ID**: demo-org-001

### 3. 生徒アカウント
- **Email**: demo-student@edore.com
- **Password**: demo123456
- **Name**: デモ生徒
- **Role**: student
- **Organization ID**: demo-org-001

## 手動作成手順

### 方法1: Supabaseダッシュボードから

1. Supabaseダッシュボードにログイン
2. Authentication → Users → Add User
3. 上記のメールアドレスとパスワードでユーザーを作成
4. デプロイされたアプリケーションでログイン
5. 登録ページで残りの情報を入力

### 方法2: アプリケーションから直接

1. アプリケーションにサインアップ機能を追加
2. 上記のアカウント情報で登録

## アプリケーションURL

- **本番環境**: https://edore-ck7jth7k2-frontriver178s-projects.vercel.app
- **ログインページ**: https://edore-ck7jth7k2-frontriver178s-projects.vercel.app/login
- **登録ページ**: https://edore-ck7jth7k2-frontriver178s-projects.vercel.app/register

## 注意事項

- パスワードは簡単なものを使用していますが、実際のデモで使用する際は適切なパスワードに変更してください
- Organization IDは全て同じにしているので、同じ組織内のユーザーとして扱われます
- 必要に応じて、テストデータ（生徒情報、スケジュールなど）も追加してください 