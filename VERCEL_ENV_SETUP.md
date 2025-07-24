# Vercel環境変数設定ガイド

## 問題の原因
現在、Supabaseの接続エラーが発生しています。これはVercelに環境変数が設定されていないためです。

## 設定手順

### 1. Vercelダッシュボードにアクセス
1. [Vercel](https://vercel.com)にログイン
2. `edore-app`プロジェクトを選択

### 2. 環境変数の設定
1. プロジェクトダッシュボードで「Settings」タブをクリック
2. 左サイドバーから「Environment Variables」を選択
3. 以下の環境変数を追加：

#### 必須の環境変数

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `REACT_APP_SUPABASE_URL` | `https://kfggjhvdpgxsgpnzbhia.supabase.co` | SupabaseプロジェクトのURL |
| `REACT_APP_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZ2dqaHZkcGd4c2dwbnpiaGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzgwNjUsImV4cCI6MjA2NjYxNDA2NX0.XQg6nZ77kVwEJIoarvJ9p5coKl0TQ1zxx6_07WsqoUU` | Supabaseの匿名キー |

#### オプションの環境変数（LINE統合用）

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `REACT_APP_LINE_CHANNEL_ACCESS_TOKEN` | （LINEチャンネルアクセストークン） | LINE Bot用 |
| `REACT_APP_LINE_CHANNEL_SECRET` | （LINEチャンネルシークレット） | LINE Bot用 |
| `REACT_APP_LINE_LOGIN_CHANNEL_ID` | （LINEログインチャンネルID） | LINEログイン用 |
| `REACT_APP_LINE_LOGIN_CALLBACK_URL` | `https://edore-app.vercel.app/auth/line/callback` | LINEログインコールバック |
| `REACT_APP_LIFF_ID` | （LIFF ID） | LIFF用 |

### 3. 環境変数の追加方法
1. 「Add New」ボタンをクリック
2. 「Name」フィールドに変数名を入力
3. 「Value」フィールドに値を入力
4. 「Environment」で以下を選択：
   - Production ✓
   - Preview ✓
   - Development ✓
5. 「Save」をクリック

### 4. デプロイの再実行
環境変数を追加した後：
1. 「Deployments」タブに移動
2. 最新のデプロイメントの「...」メニューをクリック
3. 「Redeploy」を選択
4. 「Redeploy」ボタンをクリック

## 確認方法
1. 再デプロイが完了するまで2-3分待つ
2. https://edore-app.vercel.app にアクセス
3. ログインページが正常に表示されることを確認

## トラブルシューティング
- エラーが続く場合は、ブラウザのキャッシュをクリアしてください
- Vercelのデプロイログを確認して、環境変数が正しく読み込まれているか確認してください

## セキュリティ注意事項
- 環境変数の値は機密情報です。GitHubなどの公開リポジトリにコミットしないでください
- `.env.local`ファイルはローカル開発用で、`.gitignore`に含まれています