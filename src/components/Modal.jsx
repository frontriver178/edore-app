import React, { useEffect } from 'react';
import Button from './Button';

/**
 * 統一されたモーダルコンポーネント
 * 
 * 使用例:
 * <Modal isOpen={isOpen} onClose={handleClose} title="確認">
 *   <p>本当に削除しますか？</p>
 * </Modal>
 * 
 * <Modal isOpen={isOpen} onClose={handleClose} title="編集" size="large">
 *   <form>...</form>
 * </Modal>
 * 
 * プロパティ:
 * @param {boolean} isOpen - モーダルが開いているかどうか
 * @param {function} onClose - モーダルを閉じる関数
 * @param {string} title - モーダルのタイトル
 * @param {string} size - モーダルのサイズ ('small', 'medium', 'large')
 * @param {boolean} closeOnOverlay - オーバーレイクリックで閉じるかどうか
 * @param {boolean} closeOnEscape - Escapeキーで閉じるかどうか
 * @param {string} className - 追加のCSSクラス
 * @param {ReactNode} children - モーダルの内容
 * @param {ReactNode} footer - フッター要素
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  size = 'medium',
  closeOnOverlay = true,
  closeOnEscape = true,
  className = '',
  children,
  footer,
  ...props
}) => {
  // Escapeキーでモーダルを閉じる
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // モーダルが開いているときはボディのスクロールを無効化
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // モーダルが閉じている場合は何も表示しない
  if (!isOpen) return null;

  // サイズによるクラス名
  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'modal-small';
      case 'large':
        return 'modal-large';
      default:
        return 'modal-medium';
    }
  };

  // オーバーレイクリック時の処理
  const handleOverlayClick = (event) => {
    if (closeOnOverlay && event.target === event.currentTarget) {
      onClose();
    }
  };

  // モーダルコンテナのクラス名
  const containerClasses = [
    'modal-container',
    getSizeClass(),
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} {...props}>
      <div className={containerClasses}>
        {/* ヘッダー */}
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button 
            className="modal-close"
            onClick={onClose}
            aria-label="モーダルを閉じる"
          >
            ×
          </button>
        </div>

        {/* ボディ */}
        <div className="modal-body">
          {children}
        </div>

        {/* フッター */}
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;