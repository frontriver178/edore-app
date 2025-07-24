// エラータイプの定義
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN'
};

// Supabaseエラーコードからエラータイプへのマッピング
const SUPABASE_ERROR_MAPPING = {
  // 認証エラー
  'invalid_credentials': ERROR_TYPES.AUTHENTICATION,
  'email_not_confirmed': ERROR_TYPES.AUTHENTICATION,
  'user_not_found': ERROR_TYPES.AUTHENTICATION,
  'too_many_requests': ERROR_TYPES.AUTHENTICATION,
  'signup_disabled': ERROR_TYPES.AUTHENTICATION,
  
  // 認可エラー
  'insufficient_permissions': ERROR_TYPES.AUTHORIZATION,
  'access_denied': ERROR_TYPES.AUTHORIZATION,
  
  // データベースエラー
  'PGRST116': ERROR_TYPES.NOT_FOUND, // レコードが見つからない
  '23505': ERROR_TYPES.CONFLICT,     // 一意制約違反
  '23503': ERROR_TYPES.VALIDATION,   // 外部キー制約違反
  '23514': ERROR_TYPES.VALIDATION,   // チェック制約違反
  '42P01': ERROR_TYPES.SERVER,       // テーブルが存在しない
  
  // ネットワークエラー
  'fetch_error': ERROR_TYPES.NETWORK,
  'timeout': ERROR_TYPES.NETWORK
};

// エラータイプ別のユーザーフレンドリーメッセージ
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: {
    title: 'ネットワークエラー',
    message: 'インターネット接続を確認してください。',
    action: '再試行してください'
  },
  [ERROR_TYPES.VALIDATION]: {
    title: '入力エラー',
    message: '入力内容を確認してください。',
    action: '正しい値を入力してください'
  },
  [ERROR_TYPES.AUTHENTICATION]: {
    title: '認証エラー',
    message: 'ログインが必要です。',
    action: '再度ログインしてください'
  },
  [ERROR_TYPES.AUTHORIZATION]: {
    title: '権限エラー',
    message: 'この操作を実行する権限がありません。',
    action: '管理者に問い合わせてください'
  },
  [ERROR_TYPES.NOT_FOUND]: {
    title: 'データが見つかりません',
    message: '指定されたデータが存在しません。',
    action: '別のデータを選択してください'
  },
  [ERROR_TYPES.CONFLICT]: {
    title: 'データの競合',
    message: '同じデータが既に存在します。',
    action: '別の値を使用してください'
  },
  [ERROR_TYPES.SERVER]: {
    title: 'サーバーエラー',
    message: 'サーバーで問題が発生しました。',
    action: 'しばらく時間をおいて再度お試しください'
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: '予期しないエラー',
    message: '予期しないエラーが発生しました。',
    action: 'ページを再読み込みしてください'
  }
};

// 特定のエラーメッセージのマッピング
const SPECIFIC_ERROR_MESSAGES = {
  // 認証関連
  'Invalid login credentials': 'メールアドレスまたはパスワードが間違っています。',
  'Email not confirmed': 'メールアドレスが確認されていません。確認メールをチェックしてください。',
  'User already registered': 'このメールアドレスは既に登録されています。',
  'Password should be at least 6 characters': 'パスワードは6文字以上で入力してください。',
  'Too many requests': 'リクエストが多すぎます。しばらく時間をおいて再度お試しください。',
  
  // データベース関連
  'duplicate key value violates unique constraint': '同じデータが既に存在します。',
  'violates foreign key constraint': '関連するデータが存在しません。',
  'violates check constraint': '入力値が制約に違反しています。'
};

/**
 * エラーオブジェクトを解析してエラー情報を返す
 * @param {Error|Object} error - エラーオブジェクト
 * @returns {Object} 解析されたエラー情報
 */
export const parseError = (error) => {
  if (!error) {
    return {
      type: ERROR_TYPES.UNKNOWN,
      message: 'エラーが発生しました',
      originalError: null
    };
  }

  // Supabaseエラーの場合
  if (error.code || error.message) {
    const errorCode = error.code || error.message;
    const errorType = SUPABASE_ERROR_MAPPING[errorCode] || ERROR_TYPES.UNKNOWN;
    
    // 特定のエラーメッセージがある場合
    const specificMessage = SPECIFIC_ERROR_MESSAGES[error.message];
    if (specificMessage) {
      return {
        type: errorType,
        message: specificMessage,
        originalError: error
      };
    }
    
    // 一般的なエラーメッセージ
    const errorInfo = ERROR_MESSAGES[errorType];
    return {
      type: errorType,
      message: errorInfo.message,
      title: errorInfo.title,
      action: errorInfo.action,
      originalError: error
    };
  }

  // ネットワークエラーの場合
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      type: ERROR_TYPES.NETWORK,
      message: ERROR_MESSAGES[ERROR_TYPES.NETWORK].message,
      title: ERROR_MESSAGES[ERROR_TYPES.NETWORK].title,
      action: ERROR_MESSAGES[ERROR_TYPES.NETWORK].action,
      originalError: error
    };
  }

  // その他のエラー
  return {
    type: ERROR_TYPES.UNKNOWN,
    message: error.message || 'エラーが発生しました',
    title: ERROR_MESSAGES[ERROR_TYPES.UNKNOWN].title,
    action: ERROR_MESSAGES[ERROR_TYPES.UNKNOWN].action,
    originalError: error
  };
};

/**
 * エラーをローカルストレージに保存
 * @param {Error|Object} error - エラーオブジェクト
 * @param {string} context - エラーが発生したコンテキスト
 */
const saveErrorToLocalStorage = (error, context = '') => {
  try {
    const errorLog = JSON.parse(localStorage.getItem('edore_error_log') || '[]');
    const parsedError = parseError(error);
    
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: parsedError.message,
      context,
      type: parsedError.type,
      stack: error?.stack,
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
 * エラーをログに記録する
 * @param {Error|Object} error - エラーオブジェクト
 * @param {string} context - エラーが発生したコンテキスト
 * @param {Object} additionalData - 追加のデバッグ情報
 */
export const logError = (error, context = '', additionalData = {}) => {
  const parsedError = parseError(error);
  
  const logData = {
    timestamp: new Date().toISOString(),
    context,
    errorType: parsedError.type,
    message: parsedError.message,
    originalError: parsedError.originalError,
    additionalData,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // ローカルストレージに保存
  saveErrorToLocalStorage(error, context);

  // 開発環境では詳細なログを出力
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error Log - ${context}`);
    console.error('Parsed Error:', parsedError);
    console.error('Original Error:', error);
    console.error('Additional Data:', additionalData);
    console.error('Full Log Data:', logData);
    console.groupEnd();
  }

  // 本番環境では外部サービスにエラーを送信
  // 例: Sentry, LogRocket, etc.
  if (process.env.NODE_ENV === 'production') {
    // TODO: 外部エラー追跡サービスへの送信
    console.error('Error:', logData);
  }
};

/**
 * エラーハンドリングのヘルパー関数
 * @param {Error|Object} error - エラーオブジェクト
 * @param {string} context - エラーが発生したコンテキスト
 * @param {Object} options - オプション
 * @returns {Object} エラー情報
 */
export const handleError = (error, context = '', options = {}) => {
  const { 
    showAlert = false, 
    logError: shouldLog = true,
    additionalData = {} 
  } = options;

  const parsedError = parseError(error);

  // エラーログの記録
  if (shouldLog) {
    logError(error, context, additionalData);
  }

  // アラート表示
  if (showAlert) {
    alert(parsedError.message);
  }

  return parsedError;
};

/**
 * 非同期処理のエラーハンドリングラッパー
 * @param {Function} asyncFunction - 非同期関数
 * @param {string} context - コンテキスト
 * @param {Object} options - オプション
 * @returns {Function} ラップされた関数
 */
export const withErrorHandling = (asyncFunction, context = '', options = {}) => {
  return async (...args) => {
    try {
      return await asyncFunction(...args);
    } catch (error) {
      const parsedError = handleError(error, context, options);
      
      // エラーを再スローするかどうか
      if (options.rethrow !== false) {
        throw parsedError;
      }
      
      return { error: parsedError };
    }
  };
};

/**
 * バリデーションエラーを作成
 * @param {string} message - エラーメッセージ
 * @param {string} field - フィールド名
 * @returns {Object} バリデーションエラー
 */
export const createValidationError = (message, field = '') => {
  return {
    type: ERROR_TYPES.VALIDATION,
    message,
    field,
    title: ERROR_MESSAGES[ERROR_TYPES.VALIDATION].title
  };
};

/**
 * ネットワークエラーかどうかを判定
 * @param {Error|Object} error - エラーオブジェクト
 * @returns {boolean} ネットワークエラーかどうか
 */
export const isNetworkError = (error) => {
  const parsedError = parseError(error);
  return parsedError.type === ERROR_TYPES.NETWORK;
};

/**
 * 認証エラーかどうかを判定
 * @param {Error|Object} error - エラーオブジェクト
 * @returns {boolean} 認証エラーかどうか
 */
export const isAuthError = (error) => {
  const parsedError = parseError(error);
  return parsedError.type === ERROR_TYPES.AUTHENTICATION;
}; 