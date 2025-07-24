// ログレベルの定義
export const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// 環境別のログレベル設定
const getLogLevel = () => {
  if (process.env.NODE_ENV === 'production') {
    return LOG_LEVELS.ERROR;
  } else if (process.env.NODE_ENV === 'test') {
    return LOG_LEVELS.WARN;
  } else {
    return LOG_LEVELS.DEBUG;
  }
};

const currentLogLevel = getLogLevel();

// ログレベルの優先度
const LOG_LEVEL_PRIORITY = {
  [LOG_LEVELS.ERROR]: 3,
  [LOG_LEVELS.WARN]: 2,
  [LOG_LEVELS.INFO]: 1,
  [LOG_LEVELS.DEBUG]: 0
};

/**
 * ログレベルが有効かどうかを判定
 * @param {string} level - ログレベル
 * @returns {boolean} 有効かどうか
 */
const isLogLevelEnabled = (level) => {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLogLevel];
};

/**
 * ログメッセージをフォーマット
 * @param {string} level - ログレベル
 * @param {string} message - メッセージ
 * @param {string} context - コンテキスト
 * @param {Object} data - 追加データ
 * @returns {Object} フォーマットされたログ
 */
const formatLogMessage = (level, message, context = '', data = {}) => {
  return {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    data,
    userAgent: navigator.userAgent,
    url: window.location.href,
    sessionId: getSessionId()
  };
};

/**
 * セッションIDを取得（簡易版）
 * @returns {string} セッションID
 */
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('edore_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('edore_session_id', sessionId);
  }
  return sessionId;
};

/**
 * コンソールにログを出力
 * @param {string} level - ログレベル
 * @param {Object} logData - ログデータ
 */
const outputToConsole = (level, logData) => {
  const emoji = {
    [LOG_LEVELS.ERROR]: '🚨',
    [LOG_LEVELS.WARN]: '⚠️',
    [LOG_LEVELS.INFO]: 'ℹ️',
    [LOG_LEVELS.DEBUG]: '🔍'
  };

  const color = {
    [LOG_LEVELS.ERROR]: '#dc3545',
    [LOG_LEVELS.WARN]: '#ffc107',
    [LOG_LEVELS.INFO]: '#17a2b8',
    [LOG_LEVELS.DEBUG]: '#6c757d'
  };

  const prefix = `${emoji[level]} [${level}] ${logData.context ? `[${logData.context}]` : ''}`;
  
  if (process.env.NODE_ENV === 'development') {
    console.group(`%c${prefix}`, `color: ${color[level]}; font-weight: bold;`);
    console.log(`%c${logData.message}`, `color: ${color[level]};`);
    
    if (Object.keys(logData.data).length > 0) {
      console.log('Data:', logData.data);
    }
    
    console.log('Full Log:', logData);
    console.groupEnd();
  } else {
    // 本番環境では簡潔に
    console[level.toLowerCase()](prefix, logData.message, logData.data);
  }
};

/**
 * 外部サービスにログを送信（本番環境用）
 * @param {Object} logData - ログデータ
 */
const sendToExternalService = (logData) => {
  // TODO: 外部ログサービス（Sentry, LogRocket, etc.）への送信
  // 例: Sentry.captureMessage(logData.message, logData.level, { extra: logData });
  
  // 現在は何もしない（将来の実装用）
  if (process.env.NODE_ENV === 'production') {
    // console.log('Would send to external service:', logData);
  }
};

/**
 * ログを記録する基本関数
 * @param {string} level - ログレベル
 * @param {string} message - メッセージ
 * @param {string} context - コンテキスト
 * @param {Object} data - 追加データ
 */
const log = (level, message, context = '', data = {}) => {
  if (!isLogLevelEnabled(level)) {
    return;
  }

  const logData = formatLogMessage(level, message, context, data);
  
  // コンソールに出力
  outputToConsole(level, logData);
  
  // 本番環境では外部サービスに送信
  if (process.env.NODE_ENV === 'production' && level === LOG_LEVELS.ERROR) {
    sendToExternalService(logData);
  }
};

/**
 * エラーログ
 * @param {string} message - メッセージ
 * @param {string} context - コンテキスト
 * @param {Object} data - 追加データ
 */
export const logError = (message, context = '', data = {}) => {
  log(LOG_LEVELS.ERROR, message, context, data);
};

/**
 * 警告ログ
 * @param {string} message - メッセージ
 * @param {string} context - コンテキスト
 * @param {Object} data - 追加データ
 */
export const logWarn = (message, context = '', data = {}) => {
  log(LOG_LEVELS.WARN, message, context, data);
};

/**
 * 情報ログ
 * @param {string} message - メッセージ
 * @param {string} context - コンテキスト
 * @param {Object} data - 追加データ
 */
export const logInfo = (message, context = '', data = {}) => {
  log(LOG_LEVELS.INFO, message, context, data);
};

/**
 * デバッグログ
 * @param {string} message - メッセージ
 * @param {string} context - コンテキスト
 * @param {Object} data - 追加データ
 */
export const logDebug = (message, context = '', data = {}) => {
  log(LOG_LEVELS.DEBUG, message, context, data);
};

/**
 * パフォーマンス測定のためのタイマー
 */
export class PerformanceTimer {
  constructor(name, context = '') {
    this.name = name;
    this.context = context;
    this.startTime = performance.now();
    
    logDebug(`Performance timer started: ${name}`, context);
  }

  /**
   * タイマーを終了し、経過時間をログに記録
   * @param {Object} additionalData - 追加データ
   */
  end(additionalData = {}) {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    logInfo(
      `Performance timer ended: ${this.name} (${duration.toFixed(2)}ms)`,
      this.context,
      { duration, ...additionalData }
    );
    
    return duration;
  }
}

/**
 * API呼び出しのログ
 * @param {string} method - HTTPメソッド
 * @param {string} url - URL
 * @param {Object} options - オプション
 */
export const logApiCall = (method, url, options = {}) => {
  logDebug(
    `API Call: ${method} ${url}`,
    'API',
    { method, url, ...options }
  );
};

/**
 * API応答のログ
 * @param {string} method - HTTPメソッド
 * @param {string} url - URL
 * @param {number} status - ステータスコード
 * @param {number} duration - 応答時間
 * @param {Object} data - 応答データ
 */
export const logApiResponse = (method, url, status, duration, data = {}) => {
  const level = status >= 400 ? LOG_LEVELS.ERROR : 
                status >= 300 ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;
  
  log(
    level,
    `API Response: ${method} ${url} - ${status} (${duration.toFixed(2)}ms)`,
    'API',
    { method, url, status, duration, responseData: data }
  );
};

/**
 * ユーザーアクションのログ
 * @param {string} action - アクション名
 * @param {Object} data - 追加データ
 */
export const logUserAction = (action, data = {}) => {
  logInfo(`User Action: ${action}`, 'USER', data);
};

/**
 * ページビューのログ
 * @param {string} page - ページ名
 * @param {Object} data - 追加データ
 */
export const logPageView = (page, data = {}) => {
  logInfo(`Page View: ${page}`, 'NAVIGATION', data);
};

/**
 * 開発環境でのみ実行されるログ
 * @param {Function} logFunction - ログ関数
 */
export const devOnly = (logFunction) => {
  if (process.env.NODE_ENV === 'development') {
    logFunction();
  }
};

// デフォルトエクスポート
const logger = {
  error: logError,
  warn: logWarn,
  info: logInfo,
  debug: logDebug,
  apiCall: logApiCall,
  apiResponse: logApiResponse,
  userAction: logUserAction,
  pageView: logPageView,
  PerformanceTimer,
  devOnly
};

export default logger; 