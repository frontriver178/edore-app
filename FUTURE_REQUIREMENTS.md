# Edoreアプリ 今後の機能要件定義

## 概要
Edoreアプリに以下の機能を段階的に実装していく：
1. LINE連携による通知機能
2. 講師管理ページの完全実装
3. アカウント管理機能の強化

## 1. LINE連携機能

### 1.1 目的
- 生徒にタスクの通知をLINE経由で送信
- リマインダー機能の実装
- 学習進捗の定期レポート送信

### 1.2 主要機能
#### 通知の種類
- **タスク通知**
  - 新規タスクの割り当て通知
  - タスク期限のリマインダー（前日、当日）
  - タスク完了の確認通知
  
- **授業通知**
  - 授業予定のリマインダー
  - 授業変更・キャンセルの通知
  
- **進捗レポート**
  - 週次学習レポート
  - 月次成績サマリー

### 1.3 技術要件
- LINE Messaging APIの利用
- Webhook URLの設定（Supabase Edge Functions）
- LINEアカウント連携フロー
- 通知設定の管理画面

### 1.4 データベース設計
```sql
-- LINE連携テーブル
CREATE TABLE line_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    line_user_id TEXT UNIQUE NOT NULL,
    display_name TEXT,
    picture_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 通知設定テーブル
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    frequency TEXT DEFAULT 'immediate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 通知履歴テーブル
CREATE TABLE notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 1.5 実装フェーズ
1. **Phase 1: 基本設定**（1週間）
   - LINE Developers設定
   - Supabase Edge Functions設定
   - 連携用QRコード生成

2. **Phase 2: アカウント連携**（1週間）
   - 生徒ダッシュボードにLINE連携ボタン追加
   - OAuth認証フロー実装
   - 連携解除機能

3. **Phase 3: 通知機能実装**（2週間）
   - タスク通知の実装
   - 通知設定画面の作成
   - 通知履歴の表示

4. **Phase 4: 高度な機能**（2週間）
   - リッチメニューの実装
   - インタラクティブな返信機能
   - 通知のカスタマイズ

## 2. 講師管理ページ

### 2.1 現状の問題点
- ページが正しく表示されない
- 権限管理が不完全
- UIの改善が必要

### 2.2 必要な機能
- **講師一覧表示**
  - 名前、メールアドレス、担当科目
  - ステータス（アクティブ/非アクティブ）
  - 最終ログイン日時

- **講師の追加・編集**
  - 招待コードの発行
  - プロフィール編集
  - 担当科目の設定

- **スケジュール管理**
  - 講師別の授業スケジュール表示
  - スケジュールの一括編集
  - 空き時間の可視化

- **パフォーマンス分析**
  - 授業実施数
  - 生徒からの評価
  - 出席率統計

### 2.3 UI/UX改善点
- レスポンシブデザイン
- フィルター・検索機能
- 一括操作機能
- CSVエクスポート

## 3. アカウント管理機能

### 3.1 管理者向け機能
- **組織管理**
  - サブスクリプション管理
  - 利用状況ダッシュボード
  - 請求情報管理

- **ユーザー管理**
  - 一括ユーザー登録（CSV）
  - 権限の細分化
  - アクティビティログ

- **セキュリティ設定**
  - 2要素認証
  - IPアドレス制限
  - セッション管理

### 3.2 一般ユーザー向け機能
- **プロフィール管理**
  - アバター設定
  - 通知設定
  - プライバシー設定

- **アカウント設定**
  - パスワード変更
  - メールアドレス変更
  - アカウント削除

## 4. 実装優先順位

### 短期（1-2週間）
1. 講師管理ページの修正
2. 基本的なアカウント管理機能

### 中期（3-4週間）
1. LINE連携の基本実装
2. 通知機能の実装

### 長期（1-2ヶ月）
1. 高度な分析機能
2. 自動化機能
3. AI連携機能

## 5. 技術スタック
- **フロントエンド**: React, Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL, Edge Functions)
- **通知**: LINE Messaging API
- **認証**: Supabase Auth + LINE Login
- **状態管理**: React Context API

## 6. セキュリティ考慮事項
- LINEトークンの安全な管理
- 個人情報の暗号化
- RLSポリシーの強化
- 監査ログの実装

## 7. テスト計画
- 単体テスト（Jest）
- 統合テスト
- E2Eテスト（Cypress）
- 負荷テスト

## 8. ドキュメント整備
- API仕様書
- 管理者マニュアル
- ユーザーガイド
- トラブルシューティングガイド