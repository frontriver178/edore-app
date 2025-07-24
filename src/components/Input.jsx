import React from 'react';

/**
 * 統一された入力フォームコンポーネント
 * 
 * 使用例:
 * <Input type="text" placeholder="名前を入力" />
 * <Input type="email" value={email} onChange={handleChange} required />
 * <Input type="password" error="パスワードが無効です" />
 * <Input type="number" min="0" max="100" />
 * <Input type="date" />
 * <Input as="textarea" rows={4} />
 * <Input as="select" options={options} />
 * 
 * プロパティ:
 * @param {string} type - 入力タイプ ('text', 'email', 'password', 'number', 'date', 'tel', 'url')
 * @param {string} as - 要素タイプ ('input', 'textarea', 'select')
 * @param {string} value - 現在の値
 * @param {function} onChange - 値変更時のハンドラー
 * @param {string} placeholder - プレースホルダー
 * @param {boolean} required - 必須フィールド
 * @param {boolean} disabled - 無効状態
 * @param {boolean} readOnly - 読み取り専用
 * @param {string} error - エラーメッセージ
 * @param {string} help - ヘルプテキスト
 * @param {string} className - 追加のCSSクラス
 * @param {Array} options - セレクトボックスのオプション（as="select"時）
 * @param {number} rows - テキストエリアの行数（as="textarea"時）
 * @param {number} min - 最小値（type="number"時）
 * @param {number} max - 最大値（type="number"時）
 * @param {number} step - ステップ値（type="number"時）
 * @param {number} maxLength - 最大文字数
 * @param {string} pattern - 入力パターン（正規表現）
 */
const Input = ({
  type = 'text',
  as = 'input',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
  error,
  help,
  className = '',
  options = [],
  rows = 3,
  min,
  max,
  step,
  maxLength,
  pattern,
  ...props
}) => {
  // エラー状態に応じたクラス名
  const getInputClass = () => {
    const baseClasses = ['form-input'];
    
    if (as === 'textarea') {
      baseClasses.push('form-textarea');
    } else if (as === 'select') {
      baseClasses.push('form-select');
    }
    
    if (error) {
      baseClasses.push('error');
    }
    
    if (className) {
      baseClasses.push(className);
    }
    
    return baseClasses.join(' ');
  };

  // 共通のプロパティ
  const commonProps = {
    className: getInputClass(),
    value: value || '',
    onChange,
    placeholder,
    required,
    disabled,
    readOnly,
    ...props
  };

  // テキストエリアの場合
  if (as === 'textarea') {
    return (
      <div className="form-group">
        <textarea
          {...commonProps}
          rows={rows}
          maxLength={maxLength}
        />
        {error && <div className="form-error-message">{error}</div>}
        {help && <div className="form-help">{help}</div>}
      </div>
    );
  }

  // セレクトボックスの場合
  if (as === 'select') {
    return (
      <div className="form-group">
        <select {...commonProps}>
          <option value="">{placeholder || '選択してください'}</option>
          {options.map((option, index) => (
            <option 
              key={index} 
              value={option.value || option}
            >
              {option.label || option}
            </option>
          ))}
        </select>
        {error && <div className="form-error-message">{error}</div>}
        {help && <div className="form-help">{help}</div>}
      </div>
    );
  }

  // 通常の入力フィールドの場合
  return (
    <div className="form-group">
      <input
        {...commonProps}
        type={type}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
        pattern={pattern}
      />
      {error && <div className="form-error-message">{error}</div>}
      {help && <div className="form-help">{help}</div>}
    </div>
  );
};

export default Input;