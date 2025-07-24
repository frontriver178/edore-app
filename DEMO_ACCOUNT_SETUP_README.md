# デモアカウント発行手順

このドキュメントでは、Edoreアプリのデモアカウントを発行する手順を説明します。

## 前提条件

- Supabaseプロジェクトがセットアップ済み
- 管理者権限を持つSupabaseアカウント
- データベーステーブルが作成済み

## デモアカウント発行手順

### 1. 招待コードの生成

デモアカウントを作成するには、まず招待コードを生成する必要があります。

```sql
-- まず組織を作成
INSERT INTO organizations (name, contact_email, subscription_plan, subscription_status)
VALUES ('デモ組織', 'demo@example.com', 'basic', 'active');

-- 組織IDを取得して招待コードを作成
INSERT INTO invitation_codes (
    code,
    organization_id,
    role,
    expires_at,
    created_by
) VALUES (
    'DEMO2025',  -- 任意の招待コード
    (SELECT id FROM organizations WHERE name = 'デモ組織' ORDER BY created_at DESC LIMIT 1),
    'admin',     -- 役割（admin または teacher）
    NOW() + INTERVAL '30 days',  -- 有効期限（30日後）
    'システム管理者'  -- 作成者
);
```

### 2. デモアカウントの作成

ユーザーは以下の手順でデモアカウントを作成できます：

1. アプリケーションの登録ページ（`/register`）にアクセス
2. 以下の情報を入力：
   - メールアドレス
   - パスワード（8文字以上）
   - 招待コード（上記で作成したコード）
3. 「Register」ボタンをクリック

### 3. 組織のセットアップ

アカウント作成後、自動的に組織セットアップページにリダイレクトされます：

1. 組織情報の入力：
   - 組織名（招待コードから自動入力）
   - 組織タイプ（School/Company/Other）
   - 説明（任意）
2. 「Create Organization」ボタンをクリック

### 4. デモデータの投入（オプション）

デモ環境を充実させるために、以下のサンプルデータを投入できます：

```sql
-- 生徒データの追加
INSERT INTO students (name, email, phone, organization_id, created_by)
SELECT 
    'デモ生徒' || generate_series,
    'demo' || generate_series || '@example.com',
    '090-' || LPAD(generate_series::text, 4, '0') || '-' || LPAD((generate_series * 111)::text, 4, '0'),
    organizations.id,
    auth.uid()
FROM organizations, generate_series(1, 5)
WHERE organizations.created_by = auth.uid()
LIMIT 5;

-- 講師データの追加
INSERT INTO teachers (name, email, phone, subject_expertise, organization_id, created_by)
SELECT 
    'デモ講師' || generate_series,
    'teacher' || generate_series || '@example.com',
    '080-' || LPAD(generate_series::text, 4, '0') || '-' || LPAD((generate_series * 222)::text, 4, '0'),
    CASE 
        WHEN generate_series % 3 = 0 THEN '英語'
        WHEN generate_series % 3 = 1 THEN '数学'
        ELSE '国語'
    END,
    organizations.id,
    auth.uid()
FROM organizations, generate_series(1, 3)
WHERE organizations.created_by = auth.uid()
LIMIT 3;
```

## 既存のデモアカウント

現在利用可能なデモアカウント：

| メールアドレス | パスワード | 組織名 | 役割 |
|--------------|----------|-------|-----|
| demo@naseba-academy.com | demo1234 | Naseba Academy | 管理者 |

## 実際の使用例

姫路学伸塾用の招待コード作成例：

```sql
-- まず組織を作成
INSERT INTO organizations (name, contact_email, subscription_plan, subscription_status)
VALUES ('姫路学伸塾', 'himeji@example.com', 'basic', 'active');

-- 招待コードを作成
INSERT INTO invitation_codes (
    code,
    organization_id,
    role,
    expires_at,
    created_by
) VALUES (
    'DEMOHIMEJI',
    (SELECT id FROM organizations WHERE name = '姫路学伸塾' ORDER BY created_at DESC LIMIT 1),
    'admin',
    NOW() + INTERVAL '30 days',
    'システム管理者'
);
```

## トラブルシューティング

### 招待コードが無効と表示される

1. 招待コードの有効期限を確認：
```sql
SELECT * FROM invitation_codes WHERE code = 'YOUR_CODE';
```

2. 招待コードの使用状況を確認：
```sql
SELECT code, used, expires_at, role 
FROM invitation_codes 
WHERE code = 'YOUR_CODE';
```

### ログインできない

1. メールアドレスとパスワードを確認
2. Supabaseダッシュボードでユーザーの状態を確認
3. 必要に応じてパスワードリセット

### 組織が作成できない

1. RLSポリシーが正しく設定されているか確認
2. ユーザーが認証されているか確認
3. Supabaseログでエラーを確認

## セキュリティ上の注意

- デモアカウントには実際の個人情報を使用しない
- 定期的に使用されていないデモアカウントを削除
- 招待コードは定期的に更新
- 本番環境では別の招待コード管理を使用

## 関連ドキュメント

- [Supabaseセットアップガイド](./SUPABASE_SETUP_GUIDE.md)
- [データベース設計](./database_er_diagram.md)
- [SaaS運用マニュアル](./SAAS_OPERATIONS_MANUAL.md)