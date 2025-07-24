# 統一UIコンポーネント使用ガイド

このガイドでは、Edoreアプリケーションで使用する統一UIコンポーネントの使い方を説明します。

## 概要

すべてのコンポーネントは**Google Sheets風のデザイン**で統一されており、緑色をベースとしたカラーパレットを使用しています。

## 基本的な使い方

### インポート方法

```javascript
import { Button, Input, FormGroup, Modal } from '../components';
// または
import Button from '../components/Button';
import Input from '../components/Input';
```

## Button コンポーネント

統一されたボタンコンポーネントです。

### 基本的な使用例

```javascript
// 基本ボタン
<Button>クリック</Button>

// プライマリボタン（緑色）
<Button variant="primary">保存</Button>

// セカンダリボタン
<Button variant="secondary">キャンセル</Button>

// エラーボタン
<Button variant="error">削除</Button>

// 成功ボタン
<Button variant="success">完了</Button>

// テキストボタン
<Button variant="text">編集</Button>

// ローディング状態
<Button loading={isLoading}>処理中...</Button>

// 無効状態
<Button disabled>無効</Button>
```

### サイズバリエーション

```javascript
<Button size="sm">小さいボタン</Button>
<Button size="md">通常ボタン</Button>
<Button size="lg">大きいボタン</Button>
```

### リンクとして使用

```javascript
// React Router リンク
<Button to="/students">生徒一覧</Button>

// 外部リンク
<Button href="https://example.com">外部サイト</Button>
```

## Input コンポーネント

統一された入力フィールドコンポーネントです。

### 基本的な使用例

```javascript
// テキスト入力
<Input 
  type="text" 
  placeholder="名前を入力"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

// パスワード入力
<Input 
  type="password" 
  placeholder="パスワード"
  required
/>

// 数値入力
<Input 
  type="number" 
  min="0" 
  max="100"
  placeholder="年齢"
/>

// 日付入力
<Input type="date" />

// エラー状態
<Input 
  type="email" 
  error="有効なメールアドレスを入力してください"
/>
```

### テキストエリア

```javascript
<Input 
  as="textarea" 
  rows={4} 
  placeholder="説明を入力"
/>
```

### セレクトボックス

```javascript
const options = [
  { value: 'option1', label: '選択肢1' },
  { value: 'option2', label: '選択肢2' }
];

<Input 
  as="select" 
  options={options}
  placeholder="選択してください"
/>
```

## FormGroup コンポーネント

ラベルと入力フィールドを組み合わせたフォームグループです。

### 基本的な使用例

```javascript
<FormGroup label="名前" required>
  <Input type="text" placeholder="名前を入力" />
</FormGroup>

<FormGroup label="説明" help="詳細な説明を入力してください">
  <Input as="textarea" rows={4} />
</FormGroup>

<FormGroup label="カテゴリ" error="カテゴリを選択してください">
  <Input as="select" options={categories} />
</FormGroup>
```

## Modal コンポーネント

統一されたモーダルダイアログコンポーネントです。

### 基本的な使用例

```javascript
const [isOpen, setIsOpen] = useState(false);

<Modal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)}
  title="確認"
>
  <p>本当に削除しますか？</p>
</Modal>
```

### サイズバリエーション

```javascript
<Modal size="small" title="小さいモーダル">
  <p>内容</p>
</Modal>

<Modal size="medium" title="通常モーダル">
  <p>内容</p>
</Modal>

<Modal size="large" title="大きいモーダル">
  <p>内容</p>
</Modal>
```

### フッター付きモーダル

```javascript
<Modal 
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="編集"
  footer={
    <div className="flex gap-2">
      <Button variant="primary">保存</Button>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        キャンセル
      </Button>
    </div>
  }
>
  <form>
    <FormGroup label="名前" required>
      <Input type="text" />
    </FormGroup>
  </form>
</Modal>
```

## 完全なフォーム例

```javascript
import { Button, Input, FormGroup, Modal } from '../components';

const EditStudentModal = ({ isOpen, onClose, student }) => {
  const [name, setName] = useState(student?.name || '');
  const [email, setEmail] = useState(student?.email || '');
  const [grade, setGrade] = useState(student?.grade || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // 保存処理
    setLoading(false);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="生徒情報編集"
      size="medium"
    >
      <form onSubmit={handleSubmit}>
        <FormGroup label="名前" required>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </FormGroup>

        <FormGroup label="メールアドレス">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormGroup>

        <FormGroup label="学年">
          <Input
            as="select"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            options={[
              { value: '1', label: '1年' },
              { value: '2', label: '2年' },
              { value: '3', label: '3年' }
            ]}
          />
        </FormGroup>

        <div className="form-actions">
          <Button 
            type="submit" 
            variant="primary" 
            loading={loading}
          >
            保存
          </Button>
          <Button 
            type="button" 
            variant="secondary"
            onClick={onClose}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </Modal>
  );
};
```

## CSSクラス

必要に応じて、既存のCSSクラスも併用できます：

```javascript
// 統一デザインのCSSクラス
<div className="card">
  <div className="card-header">
    <h3 className="card-title">タイトル</h3>
  </div>
  <div className="card-content">
    <p>内容</p>
  </div>
</div>

// グリッドレイアウト
<div className="grid grid-cols-2 gap-4">
  <div>左側</div>
  <div>右側</div>
</div>

// 統計カード
<div className="stats-card">
  <div className="stats-card-value">42</div>
  <div className="stats-card-label">生徒数</div>
</div>
```

## 色とテーマ

アプリケーションは緑色をベースとしたカラーパレットを使用しています：

- **プライマリカラー**: `#0f9d58` (緑)
- **セカンダリカラー**: `#f8f9fa` (薄いグレー)
- **エラーカラー**: `#d93025` (赤)
- **成功カラー**: `#34a853` (緑)

## アクセシビリティ

すべてのコンポーネントは以下のアクセシビリティ機能を持っています：

- キーボードナビゲーション対応
- スクリーンリーダー対応
- 高コントラストモード対応
- 動きを減らすモード対応

## レスポンシブデザイン

すべてのコンポーネントはモバイル対応しています：

- タブレット: 768px以下
- スマートフォン: 480px以下

## よくある使用パターン

### 1. 一覧ページのアクション

```javascript
<div className="flex gap-2">
  <Button variant="primary" onClick={handleAdd}>
    新規追加
  </Button>
  <Button variant="secondary" onClick={handleRefresh}>
    再読み込み
  </Button>
</div>
```

### 2. 削除確認

```javascript
<Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="削除確認">
  <p>「{itemName}」を削除してもよろしいですか？</p>
  <div className="form-actions">
    <Button variant="error" onClick={handleDelete}>
      削除
    </Button>
    <Button variant="secondary" onClick={() => setShowDelete(false)}>
      キャンセル
    </Button>
  </div>
</Modal>
```

### 3. 検索フォーム

```javascript
<div className="form-row">
  <FormGroup label="キーワード">
    <Input 
      type="text" 
      placeholder="検索..."
      value={keyword}
      onChange={(e) => setKeyword(e.target.value)}
    />
  </FormGroup>
  <Button variant="primary" onClick={handleSearch}>
    検索
  </Button>
</div>
```

このガイドを参考に、統一されたUIコンポーネントを活用してください。