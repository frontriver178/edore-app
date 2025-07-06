import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 統一されたButtonコンポーネント
 * 
 * 使用例:
 * <Button variant="primary" onClick={handleClick}>保存</Button>
 * <Button variant="secondary" disabled>無効</Button>
 * <Button variant="text" className="text-green">編集</Button>
 * <Button variant="error" size="sm">削除</Button>
 * <Button variant="primary" loading={isLoading}>送信中...</Button>
 * <Button to="/students">生徒一覧へ</Button>
 * <Button href="https://example.com">外部リンク</Button>
 * 
 * プロパティ:
 * @param {ReactNode} children - ボタンのテキストまたは内容
 * @param {string} variant - ボタンの種類 ('default', 'primary', 'secondary', 'text', 'success', 'error', 'logout')
 * @param {string} size - ボタンのサイズ ('sm', 'md', 'lg')
 * @param {boolean} disabled - 無効状態
 * @param {boolean} loading - ローディング状態（スピナーを表示）
 * @param {string} type - ボタンのtype属性 ('button', 'submit', 'reset')
 * @param {function} onClick - クリックハンドラー
 * @param {string} href - 外部リンクのURL
 * @param {string} to - React Router のリンク先
 * @param {string} className - 追加のCSSクラス
 */
const Button = ({
  children,
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  href,
  to,
  className = '',
  ...props
}) => {
  // バリアント（種類）によるクラス名
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'btn-primary';
      case 'secondary':
        return 'btn-secondary';
      case 'text':
        return 'btn-text';
      case 'success':
        return 'btn-success';
      case 'error':
        return 'btn-error';
      case 'logout':
        return 'btn-logout';
      default:
        return 'btn';
    }
  };

  // サイズによるクラス名
  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'btn-sm';
      case 'lg':
        return 'btn-lg';
      default:
        return '';
    }
  };

  // 基本のクラス名を組み合わせ
  const buttonClasses = [
    'btn',
    getVariantClass(),
    getSizeClass(),
    disabled && 'btn-disabled',
    loading && 'btn-loading',
    className
  ].filter(Boolean).join(' ');

  // 共通のプロパティ
  const commonProps = {
    className: buttonClasses,
    disabled: disabled || loading,
    ...props
  };

  // ローディング中のテキスト
  const displayChildren = loading ? (
    <>
      <span className="btn-spinner"></span>
      {variant === 'text' ? children : (typeof children === 'string' ? '処理中...' : children)}
    </>
  ) : children;

  // リンクの場合（react-router-dom）
  if (to) {
    return (
      <Link to={to} {...commonProps}>
        {displayChildren}
      </Link>
    );
  }

  // 外部リンクの場合
  if (href) {
    return (
      <a href={href} {...commonProps}>
        {displayChildren}
      </a>
    );
  }

  // 通常のボタンの場合
  return (
    <button 
      type={type} 
      onClick={onClick} 
      {...commonProps}
    >
      {displayChildren}
    </button>
  );
};

export default Button; 