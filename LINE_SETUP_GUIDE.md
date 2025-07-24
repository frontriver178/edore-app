# LINE連携セットアップガイド

このガイドでは、学習管理システムにLINE通知機能を設定する方法を説明します。

## 📋 必要な作業

1. **LINE Developers設定**
2. **データベース設定**
3. **環境変数設定**
4. **ユーザー側設定**

---

## 🔧 1. LINE Developers設定

### 1.1 LINE Developersアカウント作成
1. [LINE Developers](https://developers.line.biz/ja/)にアクセス
2. LINEアカウントでログイン
3. プロバイダーを作成（組織名など）

### 1.2 Messaging APIチャンネル作成
1. 「新規チャンネル作成」→「Messaging API」を選択
2. 必要情報を入力：
   - アプリ名: `学習管理システム通知Bot`
   - アプリ説明: `学習進捗とスケジュール通知`
   - 大業種: `教育・学習支援業`
   - 小業種: `その他の教育・学習支援業`

### 1.3 必要な情報を取得
以下の情報をメモしてください：
- **Channel Access Token**: チャンネル基本設定 → メッセージ送受信設定
- **Channel Secret**: チャンネル基本設定 → 基本情報

---

## 🗄️ 2. データベース設定

### 2.1 マイグレーション実行
プロジェクトルートで以下のSQLファイルを実行：

```bash
# Supabaseの場合
supabase db reset
# または直接SQLファイルを実行
psql -d your_database -f add_line_integration.sql
```

### 2.2 確認事項
以下のテーブルとカラムが追加されていることを確認：

**usersテーブル**
- `line_user_id` (VARCHAR)
- `line_display_name` (VARCHAR)
- `line_notification_enabled` (BOOLEAN)
- `line_linked_at` (TIMESTAMP)

**studentsテーブル**
- 同上のカラム

**新テーブル**
- `line_notifications`
- `line_notification_settings`

---

## ⚙️ 3. 環境変数設定

### 3.1 .env.localファイル更新
```env
# LINE Bot Configuration
REACT_APP_LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
REACT_APP_LINE_CHANNEL_SECRET=your_channel_secret_here

# LINE Notify Configuration (オプション)
REACT_APP_LINE_NOTIFY_TOKEN=your_line_notify_token_here
```

### 3.2 本番環境設定
- Vercel: Environment Variables に追加
- Netlify: Site settings → Environment variables に追加
- その他: 各プラットフォームの環境変数設定に従って追加

---

## 👤 4. ユーザー側設定

### 4.1 LINE Bot友達追加
1. LINE Developersでボットの友達追加用QRコードを取得
2. ユーザーがスマートフォンでQRコードをスキャン
3. ボットを友達追加

### 4.2 User ID取得方法

**方法1: Webhook設定（推奨）**
1. LINE Developersで Webhook URL を設定
2. サーバーでWebhookを受信してUser IDを記録
3. 管理画面でUser IDを確認

**方法2: 手動取得**
1. ユーザーがボットにメッセージを送信
2. LINE Developers → Messaging API → ログでUser IDを確認
3. マニュアルでUser IDを登録

### 4.3 アプリ内設定
1. 「マイページ」→「LINE連携設定」
2. LINE User IDを入力
3. 表示名を設定（任意）
4. 通知設定をONに設定
5. 「LINE設定を保存」をクリック
6. 「テスト通知を送信」で動作確認

---

## 🔔 5. 通知機能

### 5.1 自動通知
- **ログイン通知**: ユーザーがログインした時
- **タスク期限通知**: タスクの期限が近づいた時（1日前）
- **授業予定通知**: 授業の予定時刻（設定により）
- **面談予定通知**: 面談の予定時刻（設定により）

### 5.2 手動通知
- **テスト通知**: マイページから送信可能
- **個別通知**: 管理者が特定のユーザーに送信

---

## 🛠️ 6. トラブルシューティング

### 6.1 通知が届かない場合
1. **設定確認**:
   - LINE User IDが正しく設定されているか
   - 通知設定がONになっているか
   - 環境変数が正しく設定されているか

2. **ボット確認**:
   - ボットが友達追加されているか
   - ボットがブロックされていないか

3. **ログ確認**:
   - ブラウザコンソールでエラーログを確認
   - サーバーログでAPI呼び出しエラーを確認

### 6.2 よくあるエラー

**"Token not configured"**
- 環境変数が設定されていません
- .env.localファイルを確認してください

**"LINE API Error: Invalid reply token"**
- User IDが間違っている可能性があります
- 正しいUser IDを再設定してください

**"USER_NOT_FOUND"**
- ボットが友達追加されていません
- QRコードをスキャンして友達追加してください

---

## 📝 7. 今後の拡張

### 7.1 予定されている機能
- **予約通知**: 授業予約時の自動通知
- **成績通知**: テスト結果の通知
- **出席通知**: 授業出席/欠席の通知
- **宿題リマインダー**: 宿題の締切前通知

### 7.2 カスタマイズ
- 通知メッセージのテンプレート変更
- 通知タイミングの調整
- 通知の有効/無効切り替え

---

## 🔐 8. セキュリティ

### 8.1 注意事項
- **Channel Access Token**: 絶対に公開しないでください
- **User ID**: 個人情報として適切に管理してください
- **通知内容**: 機密情報を含めないよう注意してください

### 8.2 推奨事項
- 定期的にアクセストークンを更新
- 不要になったUser IDは削除
- 通知ログの定期的なクリーンアップ

---

## 📞 サポート

設定や使用中に問題が発生した場合は、以下を確認してください：

1. この設定ガイド
2. LINE Developers公式ドキュメント
3. アプリケーションのログファイル
4. システム管理者への連絡

---

**設定完了後、必ずテスト通知で動作確認を行ってください。**