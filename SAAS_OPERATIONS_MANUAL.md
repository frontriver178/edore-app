# 🏢 Edore SaaS 運営管理マニュアル

## 📋 概要

本マニュアルは、Edore SaaSの運営チームが新規塾のアカウント開設、招待コード管理、ユーザーサポートを行うための完全なガイドです。

---

## 🔒 RLSポリシー動作確認

### ✅ セキュリティチェック手順

#### 1. RLSポリシー状態確認
```sql
-- Supabase SQL Editor で実行
-- 現在のRLSポリシー一覧と有効状態を確認
SELECT '=== RLSポリシー一覧 ===' as section;
SELECT schemaname, tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public';

SELECT '=== RLS有効状態 ===' as section;
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

#### 2. 組織間データ分離テスト
```sql
-- 組織間でのデータアクセス制御をテスト
SELECT * FROM test_rls_policies(
    'test-user-12345'::UUID, 
    '11111111-1111-1111-1111-111111111111'::UUID
);
```

**期待される結果:**
- `organization_data_isolation`: PASS
- `cross_organization_isolation`: PASS

---

## 🎫 招待コード作成手順

### 📝 基本的な招待コード作成

#### 1. 管理者招待コード作成
```sql
-- 管理者用招待コード（30日有効）
SELECT * FROM admin_create_invitation_code(
    '組織UUID',           -- 対象組織のID
    'admin',              -- 役割（admin/teacher）
    30,                   -- 有効期限（日数）
    '運営担当者名',       -- 作成者名
    NULL                  -- カスタムコード（NULLで自動生成）
);
```

#### 2. 講師招待コード作成
```sql
-- 講師用招待コード（30日有効）
SELECT * FROM admin_create_invitation_code(
    '組織UUID',
    'teacher',
    30,
    '運営担当者名',
    NULL
);
```

#### 3. カスタム招待コード作成
```sql
-- 特定のコードで作成したい場合
SELECT * FROM admin_create_invitation_code(
    '組織UUID',
    'admin',
    30,
    '運営担当者名',
    'CUSTOM-CODE-2024'    -- 任意のコード指定
);
```

### 📊 招待コード管理

#### 1. 招待コード一覧確認
```sql
-- 全ての招待コード表示
SELECT * FROM admin_list_invitation_codes();

-- 特定組織の招待コード表示
SELECT * FROM admin_list_invitation_codes('組織UUID');
```

#### 2. 招待コード無効化
```sql
-- 招待コードの無効化
SELECT * FROM admin_revoke_invitation_code('ADMIN-ABC123');
```

---

## 🏢 SaaS運営ワークフロー

### 🔄 パターン1: 営業経由での新規開設

#### Step 1: 営業チームから情報受領
**必要情報:**
- 塾名
- 代表者名
- 連絡先メールアドレス
- 電話番号
- 住所
- 契約プラン（basic/standard/premium）

#### Step 2: 組織作成と招待コード発行
```sql
-- 新規組織作成（管理者・講師コード同時生成）
SELECT * FROM admin_create_organization(
    '○○進学塾',                     -- 塾名
    'admin@example-juku.com',        -- 代表者メール
    '03-1234-5678',                  -- 電話番号
    '東京都渋谷区○○1-2-3',          -- 住所
    'standard',                      -- プラン
    '運営担当者名'                   -- 作成者
);
```

**実行結果例:**
```
success: true
organization_id: 12345678-1234-1234-1234-123456789012
admin_invitation_code: ADMIN-A1B2C3D4
teacher_invitation_code: TEACHER-E5F6G7H8
message: 組織と招待コードが正常に作成されました。
```

#### Step 3: 顧客への情報送付
**送付内容:**
```
件名: Edoreアカウント開設完了のご案内

○○進学塾 様

この度は、Edoreをご契約いただき、誠にありがとうございます。
アカウントの準備が完了いたしましたので、ご案内いたします。

【アクセス情報】
・サービスURL: https://edore-app.com
・管理者招待コード: ADMIN-A1B2C3D4
・講師招待コード: TEACHER-E5F6G7H8

【初回ログイン手順】
1. 上記URLにアクセス
2. 「サインアップ」から新規アカウント作成
3. メール認証を完了
4. オンボーディング画面で「招待コードで参加」を選択
5. 管理者招待コードを入力してアカウント設定完了

※招待コードの有効期限: 30日間
※不明な点がございましたら、お気軽にお問い合わせください。

Edore運営チーム
```

### 🔄 パターン2: Webサイト申請経由での開設

#### Step 1: 申請受領確認
```sql
-- 保留中の申請一覧確認
SELECT * FROM organization_applications WHERE status = 'pending' ORDER BY created_at DESC;
```

#### Step 2: 申請内容審査
**審査ポイント:**
- 塾名の妥当性
- 連絡先情報の正確性
- 事業内容の適切性
- 重複申請の確認

#### Step 3: 申請承認と組織作成
```sql
-- 申請承認（組織・招待コード自動作成）
SELECT * FROM admin_approve_organization_application(
    '申請UUID',                      -- application_id
    '運営担当者名',                  -- 承認者名
    '審査完了。通常プランで開始。'   -- 承認メモ
);
```

#### Step 4: 申請者への通知
**承認通知メール:**
```
件名: Edore 組織申請承認のご案内

○○進学塾 様

先日お申し込みいただきました、Edoreの組織申請が承認されました。

【アカウント情報】
・管理者招待コード: ADMIN-X1Y2Z3A4
・サービスURL: https://edore-app.com

【セットアップ手順】
申請時のメールアドレスでサインアップ後、
上記招待コードを使用してアカウント設定を完了してください。

今後ともEdoreをよろしくお願いいたします。

Edore運営チーム
```

---

## 📊 運営ダッシュボード

### 📈 統計情報確認
```sql
-- 運営ダッシュボード統計
SELECT * FROM admin_dashboard_stats;
```

**確認項目:**
- アクティブ組織数
- 総ユーザー数
- 有効招待コード数
- 保留中申請数
- 総生徒数

### 📋 最近の活動確認
```sql
-- 最近7日間の活動
SELECT * FROM admin_recent_activities LIMIT 20;
```

**活動タイプ:**
- `user_registration`: 新規ユーザー登録
- `organization_application`: 組織申請
- `invitation_used`: 招待コード使用

---

## 🔧 トラブルシューティング

### ❓ よくある問い合わせと対応

#### 1. 「招待コードが無効です」
**確認手順:**
```sql
-- 招待コード詳細確認
SELECT * FROM debug_invitation_detail('問題のコード');
```

**対応:**
- コードの有効期限確認
- 使用済み状態確認
- 新しいコード発行

#### 2. 「ログインできません」
**確認手順:**
```sql
-- ユーザー情報確認
SELECT * FROM users WHERE email = 'ユーザーメール';
```

**対応:**
- ユーザーレコード存在確認
- 組織との紐付け確認
- パスワードリセット案内

#### 3. 「生徒データが見えません」
**確認手順:**
```sql
-- 組織データ確認
SELECT u.email, u.role, o.name FROM users u 
JOIN organizations o ON u.organization_id = o.id 
WHERE u.email = 'ユーザーメール';
```

**対応:**
- RLSポリシー動作確認
- 組織の紐付け確認

### 🚨 緊急時の対応

#### 1. 招待コード緊急発行
```sql
-- 7日間有効の緊急コード
SELECT * FROM admin_create_invitation_code(
    '組織UUID',
    'admin',
    7,                        -- 短期有効期限
    '緊急対応',
    'EMERGENCY-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6))
);
```

#### 2. データベース整合性チェック
```sql
-- システム全体状態確認
SELECT * FROM debug_system_status();
```

---

## 📋 定期メンテナンス

### 🗓️ 日次作業

#### 1. 新規申請確認
```sql
-- 昨日の新規申請
SELECT * FROM organization_applications 
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
AND status = 'pending';
```

#### 2. 期限切れコードクリーンアップ
```sql
-- 期限切れコード確認
SELECT code, organization_name, expires_at FROM admin_list_invitation_codes()
WHERE status = 'EXPIRED';
```

### 🗓️ 週次作業

#### 1. 利用統計レポート
```sql
-- 週間統計
SELECT 
    DATE(created_at) as date,
    COUNT(*) as new_users
FROM users 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

#### 2. 非アクティブ組織確認
```sql
-- 30日間ログインなし組織
SELECT o.name, MAX(u.updated_at) as last_activity
FROM organizations o
JOIN users u ON o.id = u.organization_id
GROUP BY o.id, o.name
HAVING MAX(u.updated_at) < NOW() - INTERVAL '30 days';
```

---

## 🔐 セキュリティ管理

### 🛡️ アクセス権限

**運営チーム権限レベル:**
- **Level 1 (サポート)**: 招待コード確認・発行のみ
- **Level 2 (管理者)**: 組織作成・申請承認
- **Level 3 (システム管理者)**: 全機能アクセス

### 🔒 セキュリティチェックリスト

- [ ] RLSポリシーが全テーブルで有効
- [ ] 招待コードの適切な有効期限設定
- [ ] 組織間データ分離の動作確認
- [ ] 管理者権限の適切な設定
- [ ] ログの定期確認

---

## 📞 エスカレーション

### 🆘 Level 1 → Level 2
- 招待コード問題
- ユーザーログイン問題
- 一般的なサポート問い合わせ

### 🚨 Level 2 → Level 3
- データベース整合性問題
- RLSポリシー動作異常
- システム全体の不具合

### 📧 緊急連絡先
- システム管理者: admin@edore.com
- 開発チーム: dev@edore.com
- 営業チーム: sales@edore.com

---

## 📝 記録管理

### 📋 必須記録事項
- 組織作成日時・担当者
- 招待コード発行履歴
- 申請承認・拒否理由
- トラブル対応履歴

### 💾 データ保持期間
- 招待コード履歴: 1年間
- 申請履歴: 3年間
- ユーザー活動ログ: 6ヶ月
- エラーログ: 3ヶ月

---

このマニュアルにより、運営チームは安全かつ効率的にEdore SaaSを管理できます。定期的な見直しと更新を行い、常に最新の運営手順を維持してください。 