import { handleError, logError } from './errorHandler';
import logger from './logger';

/**
 * グローバルエラーハンドラーの設定
 */
export const setupGlobalErrorHandlers = () => {
  // 未処理のJavaScriptエラーをキャッチ
  window.addEventListener('error', (event) => {
    const { error, filename, lineno, colno, message } = event;
    
    // Chrome拡張機能のエラーを除外
    if (filename && filename.includes('chrome-extension://')) {
      logger.debug('Chrome拡張機能のエラーをスキップ', 'GlobalErrorHandler', {
        filename,
        message,
        lineno,
        colno
      });
      return;
    }
    
    // 外部スクリプトのエラーを除外
    if (filename && !filename.includes(window.location.origin)) {
      logger.debug('外部スクリプトのエラーをスキップ', 'GlobalErrorHandler', {
        filename,
        message
      });
      return;
    }
    
    // アプリケーションのエラーを処理
    const errorObj = error || new Error(message);
    saveErrorToLocalStorage(errorObj, 'Global Error');
    handleError(errorObj, 'Global Error', {
      filename,
      lineno,
      colno,
      stack: error?.stack
    });
  });

  // 未処理のPromise rejectionをキャッチ
  window.addEventListener('unhandledrejection', (event) => {
    const { reason, promise } = event;
    
    // Chrome拡張機能関連のエラーを除外
    if (reason && reason.stack && reason.stack.includes('chrome-extension://')) {
      logger.debug('Chrome拡張機能のPromise rejectionをスキップ', 'GlobalErrorHandler', {
        reason: reason.message || reason
      });
      return;
    }
    
    // アプリケーションのPromise rejectionを処理
    saveErrorToLocalStorage(reason, 'Unhandled Promise Rejection');
    handleError(reason, 'Unhandled Promise Rejection', {
      promise: promise.toString(),
      stack: reason?.stack
    });
    
    // デフォルトの処理を防ぐ（必要に応じて）
    // event.preventDefault();
  });

  // リソース読み込みエラーをキャッチ
  window.addEventListener('error', (event) => {
    const target = event.target;
    
    // リソース読み込みエラーの場合
    if (target && target !== window) {
      const tagName = target.tagName?.toLowerCase();
      const src = target.src || target.href;
      
      // Chrome拡張機能のリソースエラーを除外
      if (src && src.includes('chrome-extension://')) {
        return;
      }
      
      logError('リソース読み込みエラー', 'Resource Loading', {
        tagName,
        src,
        type: target.type,
        crossOrigin: target.crossOrigin
      });
    }
  }, true); // キャプチャフェーズで実行

  // コンソールエラーの監視（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    const originalConsoleError = console.error;
    console.error = function(...args) {
      // Chrome拡張機能のエラーを除外
      const message = args.join(' ');
      if (!message.includes('chrome-extension://')) {
        logger.error('Console Error', 'Console', { args });
      }
      originalConsoleError.apply(console, args);
    };
  }
};

/**
 * 特定のエラーパターンを無視するフィルター
 */
const shouldIgnoreError = (error, context = '') => {
  if (!error) return true;
  
  const message = error.message || error.toString();
  
  // 無視するエラーパターン
  const ignorePatterns = [
    'chrome-extension://',
    'moz-extension://',
    'safari-extension://',
    'Script error.',
    'Non-Error promise rejection captured',
    'ResizeObserver loop limit exceeded',
    'ChunkLoadError',
    'Loading chunk',
    'Network request failed'
  ];
  
  return ignorePatterns.some(pattern => 
    message.includes(pattern) || 
    (error.stack && error.stack.includes(pattern))
  );
};

/**
 * エラーの重要度を判定
 */
const getErrorSeverity = (error, context = '') => {
  if (!error) return 'low';
  
  const message = error.message || error.toString();
  
  // 高重要度のエラーパターン
  const highSeverityPatterns = [
    'TypeError',
    'ReferenceError',
    'SyntaxError',
    'RangeError',
    'Cannot read properties',
    'Cannot access before initialization',
    'is not a function',
    'is not defined'
  ];
  
  // 中重要度のエラーパターン
  const mediumSeverityPatterns = [
    'Network',
    'Fetch',
    'CORS',
    'Timeout',
    'Abort'
  ];
  
  if (highSeverityPatterns.some(pattern => message.includes(pattern))) {
    return 'high';
  }
  
  if (mediumSeverityPatterns.some(pattern => message.includes(pattern))) {
    return 'medium';
  }
  
  return 'low';
};

/**
 * エラーレポートの生成
 */
export const generateErrorReport = () => {
  const errors = JSON.parse(localStorage.getItem('edore_error_log') || '[]');
  
  const report = {
    timestamp: new Date().toISOString(),
    totalErrors: errors.length,
    errorsByType: {},
    errorsByContext: {},
    recentErrors: errors.slice(-10),
    userAgent: navigator.userAgent,
    url: window.location.href,
    sessionId: sessionStorage.getItem('edore_session_id')
  };
  
  // エラーをタイプ別に集計
  errors.forEach(error => {
    const type = error.type || 'unknown';
    report.errorsByType[type] = (report.errorsByType[type] || 0) + 1;
    
    const context = error.context || 'unknown';
    report.errorsByContext[context] = (report.errorsByContext[context] || 0) + 1;
  });
  
  return report;
};

/**
 * エラーログをローカルストレージに保存（軽量版）
 */
const saveErrorToLocalStorage = (error, context = '') => {
  try {
    const errorLog = JSON.parse(localStorage.getItem('edore_error_log') || '[]');
    
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message || error.toString(),
      context,
      type: error.name || 'Error',
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: sessionStorage.getItem('edore_session_id')
    };
    
    errorLog.push(errorEntry);
    
    // 最新100件のみ保持
    if (errorLog.length > 100) {
      errorLog.splice(0, errorLog.length - 100);
    }
    
    localStorage.setItem('edore_error_log', JSON.stringify(errorLog));
  } catch (storageError) {
    console.warn('エラーログの保存に失敗:', storageError);
  }
};

/**
 * エラーログのクリア
 */
export const clearErrorLog = () => {
  localStorage.removeItem('edore_error_log');
};

/**
 * デバッグ用のエラー情報表示
 */
export const showErrorDebugInfo = () => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('エラーデバッグ情報は開発環境でのみ利用可能です');
    return;
  }
  
  const report = generateErrorReport();
  
  console.group('🐛 エラーデバッグ情報');
  console.log('📊 エラーレポート:', report);
  console.log('🗂️ ローカルストレージ:', localStorage.getItem('edore_error_log'));
  console.groupEnd();
  
  return report;
};

// 開発環境でのみグローバルに公開
if (process.env.NODE_ENV === 'development') {
  window.edoreErrorDebug = {
    showErrorDebugInfo,
    generateErrorReport,
    clearErrorLog
  };
} 