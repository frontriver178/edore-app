# 🏢 Edore マルチテナント対応 データベースセットアップガイド

## 📌 概要
他塾にも販売するSaaSサービスとして、マルチテナント（複数組織）対応のデータベース構造を構築します。

## 🗂 システム設計のポイント

### 1. **マルチテナント対応**
- 各塾（organization）ごとにデータを完全分離
- Row Level Security (RLS) でデータアクセス制御
- 組織IDによる自動フィルタリング

### 2. **スケーラビリティ**
- サブスクリプション管理機能
- パフォーマンス最適化（インデックス）
- 将来の機能拡張に対応

### 3. **セキュリティ**
- 組織間のデータ漏洩防止
- 役割ベースのアクセス制御
- 自動的なデータ分離

---

## 🛠 セットアップ手順

### **Step 1: Supabase管理画面にアクセス**
1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクト選択: `edore-app`
3. 左メニューから「SQL Editor」をクリック

### **Step 2: SQLスクリプト実行**
1. 「+ New query」をクリック
2. `database_setup.sql` の内容をコピー&ペースト
3. 「Run」ボタンをクリックして実行

### **Step 3: 実行結果確認**
以下のテーブルが作成されることを確認：
- ✅ organizations (組織情報)
- ✅ users (ユーザー情報)  
- ✅ students (生徒情報)
- ✅ interviews (面談記録)
- ✅ tasks (学習タスク)
- ✅ materials (教材管理)
- ✅ scores (成績)

### **Step 4: サンプルデータ確認**
1. 「Table Editor」から各テーブルを確認
2. サンプル組織とサンプル生徒データが挿入されていることを確認

---

## 🔐 Row Level Security (RLS) 設定内容

### **データアクセス制御**
- **ユーザーは自分の組織のデータのみアクセス可能**
- **組織管理者のみ組織設定にアクセス可能**
- **自動的な組織フィルタリング**

### **セキュリティポリシー例**
```sql
-- ユーザーは自分の組織の生徒データのみ参照可能
CREATE POLICY "Students organization access" ON students
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );
```

---

## 🚀 アプリケーション側の実装

### **Step 5: 組織選択機能の追加**
既存のアプリに以下の機能を追加：

1. **組織選択ページ** - 新規塾の登録
2. **管理者登録フロー** - 初回セットアップ
3. **招待機能** - 講師・生徒の招待

### **Step 6: ユーザー登録フローの改善**
```javascript
// 組織管理者の初回登録
const createOrganizationAndAdmin = async (orgData, userData) => {
  // 1. 組織作成
  const { data: org } = await supabase
    .from('organizations')
    .insert(orgData)
    .select()
    .single()
  
  // 2. 管理者ユーザー作成
  await supabase
    .from('users')
    .insert({
      id: user.id,
      organization_id: org.id,
      role: 'admin',
      name: userData.name
    })
}
```

---

## 📊 運用フロー

### **新規塾の登録フロー**
1. **塾管理者がアカウント作成**
   - メールアドレス・パスワード設定
   
2. **組織情報登録**
   - 塾名、連絡先、住所等
   
3. **管理者情報登録**
   - 管理者名、役割設定
   
4. **講師・生徒の招待**
   - メール招待機能
   - 一括登録機能

### **日常運用フロー**
1. **講師ログイン** → 担当生徒の管理
2. **生徒ログイン** → 自分の課題・成績確認
3. **管理者ログイン** → 全体管理・設定

---

## 🔧 トラブルシューティング

### **よくある問題と解決方法**

#### 1. **組織情報が取得できない**
```sql
-- 現在のユーザーの組織ID確認
SELECT u.organization_id, o.name 
FROM users u 
JOIN organizations o ON u.organization_id = o.id 
WHERE u.id = auth.uid();
```

#### 2. **RLSエラーが発生する**
```sql
-- RLS設定確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('students', 'users', 'organizations');
```

#### 3. **データが表示されない**
- ユーザーがusersテーブルに登録されているか確認
- 正しいorganization_idが設定されているか確認

---

## 📈 今後の拡張予定

### **Phase 2: 高度な機能**
- 📊 ダッシュボード機能
- 📧 自動通知システム
- 💰 請求・決済機能
- 📱 モバイルアプリ対応

### **Phase 3: AI機能**
- 🤖 学習分析AI
- 📝 自動レポート生成
- 🎯 個別学習プラン提案

---

## 💡 参考リンク
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [マルチテナント設計](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
- [PostgreSQL ポリシー設定](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) 