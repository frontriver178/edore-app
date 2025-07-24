import React from 'react';

/**
 * 統一されたラベルコンポーネント
 * 
 * 使用例:
 * <Label htmlFor="name">名前</Label>
 * <Label required>メールアドレス</Label>
 * <Label className="custom-label">カスタムラベル</Label>
 * 
 * プロパティ:
 * @param {ReactNode} children - ラベルのテキスト
 * @param {string} htmlFor - 関連する入力要素のID
 * @param {boolean} required - 必須フィールドかどうか
 * @param {string} className - 追加のCSSクラス
 */
const Label = ({
  children,
  htmlFor,
  required = false,
  className = '',
  ...props
}) => {
  // クラス名を組み合わせ
  const labelClasses = [
    'form-label',
    required && 'required',
    className
  ].filter(Boolean).join(' ');

  return (
    <label 
      htmlFor={htmlFor} 
      className={labelClasses}
      {...props}
    >
      {children}
    </label>
  );
};

export default Label;