import React from 'react';
import Label from './Label';
import Input from './Input';

/**
 * ラベルと入力フィールドを組み合わせたフォームグループコンポーネント
 * 
 * 使用例:
 * <FormGroup label="名前" required>
 *   <Input type="text" placeholder="名前を入力" />
 * </FormGroup>
 * 
 * <FormGroup label="説明">
 *   <Input as="textarea" rows={4} />
 * </FormGroup>
 * 
 * <FormGroup label="カテゴリ">
 *   <Input as="select" options={options} />
 * </FormGroup>
 * 
 * プロパティ:
 * @param {string} label - ラベルテキスト
 * @param {boolean} required - 必須フィールド
 * @param {string} error - エラーメッセージ
 * @param {string} help - ヘルプテキスト
 * @param {string} className - 追加のCSSクラス
 * @param {ReactNode} children - 入力要素
 */
const FormGroup = ({
  label,
  required = false,
  error,
  help,
  className = '',
  children,
  ...props
}) => {
  // フォームグループのクラス名
  const groupClasses = [
    'form-group',
    error && 'has-error',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={groupClasses} {...props}>
      {label && (
        <Label required={required}>
          {label}
        </Label>
      )}
      {children}
      {error && <div className="form-error-message">{error}</div>}
      {help && <div className="form-help">{help}</div>}
    </div>
  );
};

export default FormGroup;