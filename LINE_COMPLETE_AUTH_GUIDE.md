# LINE完全認証システム設定ガイド

このガイドでは、メール・パスワード認証を使わずに**LINEのみ**でアカウント作成とログインができるシステムの設定方法を説明します。

---

## 🎯 実装された機能

### ✅ 完了機能
1. **LINE Login認証フロー**
2. **LIFF（LINE Front-end Framework）対応**
3. **LINE認証による自動アカウント作成**
4. **既存アカウントとLINE連携**
5. **招待コードベースの新規登録**
6. **ログイン・スケジュール・タスク通知**

### 🚀 新機能
- **完全LINEログイン**: メール・パスワード不要
- **自動アカウント作成**: LINE初回ログイン時に自動でアカウント生成
- **LIFF対応**: LINE内ブラウザで最適な体験
- **招待コード連携**: 管理者が発行した招待コードで組織参加

---

## 🔧 1. LINE Developers設定

### 1.1 プロバイダー作成
1. [LINE Developers Console](https://developers.line.biz/)にアクセス
2. プロバイダーを作成（学習塾名など）

### 1.2 LINE Loginチャンネル作成
1. **「新規チャンネル作成」** → **「LINE Login」**を選択
2. 必要情報を入力：
   - チャンネル名: `学習管理システム認証`
   - チャンネル説明: `学習管理システムへのログイン`
   - アプリタイプ: `ウェブアプリ`

### 1.3 LINE Loginチャンネル設定

**基本設定**
- Channel ID をメモ 2007784554
- Channel Secret をメモ 4021176385c2682fc3f2f6d3fdd34cf4
- **コールバックURL**を追加:
  ```
  http://localhost:3000/auth/line/callback
  https://yourdomain.com/auth/line/callback
  ```
- **スコープ設定**: `profile`, `openid`を有効化

### 1.4 LIFFアプリ作成
1. LINE Loginチャンネル内で **「LIFF」** タブを選択
2. **「追加」**をクリック
3. LIFF設定：
   - LIFF アプリ名: `学習管理システム`
   - サイズ: `Full`
   - エンドポイントURL: `https://yourdomain.com`
   - スコープ: `profile`, `openid`
   - ボットリンク機能: **ON**（通知ボットと連携）
4. **LIFF ID**をメモ

### 1.5 Messaging APIチャンネル連携
LIFFアプリの設定で、既存のMessaging APIチャンネル（通知ボット）とリンクさせることで、ログインと同時にボット友達追加が可能になります。

---

## ⚙️ 2. 環境変数設定

`.env.local`を更新：

```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# LINE Login Configuration
REACT_APP_LINE_LOGIN_CHANNEL_ID=your_line_login_channel_id
REACT_APP_LINE_LOGIN_CALLBACK_URL=https://yourdomain.com/auth/line/callback
REACT_APP_LINE_CHANNEL_SECRET=your_line_channel_secret

# LIFF Configuration
REACT_APP_LIFF_ID=your_liff_id

# LINE Bot Configuration (通知用)
REACT_APP_LINE_CHANNEL_ACCESS_TOKEN=your_messaging_api_token
```

---

## 🗄️ 3. データベース設定

### 3.1 マイグレーション実行

```sql
-- add_line_integration.sql を実行
psql -d your_database -f add_line_integration.sql
```

### 3.2 Supabaseの場合

```bash
# Supabase CLI経由
supabase db reset

# または管理画面でSQLを実行
```

---

## 👥 4. 招待コード管理

### 4.1 招待コード作成（管理者操作）

```sql
-- 生徒用招待コード
INSERT INTO invitation_codes (
  code, 
  organization_id, 
  default_role, 
  max_uses, 
  expires_at
) VALUES (
  'STUDENT2024001',
  'your_organization_id',
  'student',
  50,
  '2024-12-31 23:59:59'
);

-- 講師用招待コード
INSERT INTO invitation_codes (
  code, 
  organization_id, 
  default_role, 
  max_uses, 
  expires_at
) VALUES (
  'TEACHER2024001',
  'your_organization_id',
  'teacher',
  10,
  '2024-12-31 23:59:59'
);
```

### 4.2 招待URL生成

ユーザーに送信する招待URLの形式：
```
https://yourdomain.com/login?invitation=STUDENT2024001
```

---

## 📱 5. ユーザー利用フロー

### 5.1 生徒・講師の初回登録

1. **管理者が招待コード付きURLを送信**
   ```
   https://yourapp.com/login?invitation=STUDENT2024001
   ```

2. **ユーザーがURLにアクセス**
   - ログインページが表示される
   - 招待コードが自動で適用される

3. **「LINEアカウントでログイン」をクリック**
   - LINE Loginページにリダイレクト
   - LINEアカウントで認証

4. **自動アカウント作成**
   - 招待コードに基づいて組織に参加
   - 役割（生徒/講師）が自動設定
   - データベースにユーザー情報を保存

5. **ダッシュボードにリダイレクト**
   - 生徒: 生徒ダッシュボード
   - 講師: 生徒一覧ページ

### 5.2 2回目以降のログイン

1. **ログインページで「LINEアカウントでログイン」**
2. **既存アカウントを検出**
3. **自動ログイン完了**

---

## 🔄 6. LIFF環境（LINE内ブラウザ）

### 6.1 LIFF専用の動作
- LINE内ブラウザで開いた場合、よりスムーズな認証
- 認証完了後にLIFF画面を閉じる選択肢
- LINE内での最適なUI/UX

### 6.2 LIFF URL共有
管理者が以下のURLを共有：
```
https://liff.line.me/your_liff_id?invitation=STUDENT2024001
```

---

## 🔔 7. 通知システム連携

### 7.1 自動通知機能
- **ログイン通知**: 初回登録・ログイン時
- **タスク通知**: 期限前とタスク作成時
- **スケジュール通知**: 授業・面談予定

### 7.2 ボット友達追加促進
LIFFアプリのボットリンク機能により、ログイン時に自動で通知ボットの友達追加が促進されます。

---

## 🛠️ 8. トラブルシューティング

### 8.1 よくある問題

**「招待コードが必要です」エラー**
- URLに`?invitation=CODE`が含まれているか確認
- 招待コードが有効（期限・使用回数）か確認

**「LINE認証エラー」**
- Channel ID・Secret が正しく設定されているか確認
- コールバックURLがLINE Developersに登録されているか確認

**「LIFF初期化エラー」**
- LIFF IDが正しく設定されているか確認
- HTTPS環境で動作しているか確認（本番環境）

### 8.2 デバッグ方法

**ブラウザコンソール確認**
```javascript
// LIFF状態確認
console.log('LIFF ready:', window.liff?.isReady());
console.log('LIFF in client:', window.liff?.isInClient());
console.log('LIFF logged in:', window.liff?.isLoggedIn());
```

**認証状態確認**
```javascript
// ローカルストレージ確認
console.log('LINE auth data:', localStorage.getItem('line_auth_data'));
```

---

## 🔐 9. セキュリティ考慮事項

### 9.1 重要な設定
- **Channel Secret**: 絶対に公開しない
- **HTTPS必須**: 本番環境では必須
- **招待コード管理**: 定期的な無効化・再発行

### 9.2 推奨事項
- 招待コードに有効期限を設定
- 使用回数制限を設定
- 不要な招待コードは無効化
- ログイン通知で不正ログインを検知

---

## 📈 10. 運用フロー

### 10.1 新入生・新講師の追加
1. 管理者が招待コードを発行
2. 招待URL（LIFF URL）を送信
3. ユーザーがLINEログインで登録
4. 自動でシステム利用開始

### 10.2 管理者の作業
- 招待コードの定期発行
- 期限切れコードの管理
- ユーザー登録状況の確認
- 通知設定の調整

---

## 🚀 11. 本番環境デプロイ

### 11.1 事前準備
1. **ドメイン設定**
2. **HTTPS証明書設定**
3. **環境変数の本番用更新**
4. **LINE Developersの本番URL登録**

### 11.2 デプロイ手順
1. **コールバックURLを本番URLに更新**
2. **LIFF エンドポイントURLを本番URLに更新**
3. **環境変数を本番環境に設定**
4. **データベースマイグレーション実行**
5. **招待コード初期設定**

---

## 📞 12. サポート・メンテナンス

### 12.1 定期メンテナンス
- 招待コードの管理
- 通知ログの確認
- 認証ログの監視

### 12.2 ユーザーサポート
- LINE認証の説明資料作成
- 招待URL送信テンプレート
- トラブル時の対応手順

---

**🎉 これで完全LINEログインシステムの準備が完了です！**

メール・パスワードを一切使わずに、LINEアカウントのみでシステムを利用できるようになります。