// バリデーション関連のユーティリティ関数

/**
 * UUIDの形式をチェックする
 * @param {string} uuid - チェックするUUID文字列
 * @returns {boolean} 有効なUUIDの場合true
 */
export const isValidUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * 組織IDのバリデーションチェック
 * @param {string} organizationId - チェックする組織ID
 * @returns {object} {isValid: boolean, message: string}
 */
export const validateOrganizationId = (organizationId) => {
  if (!organizationId) {
    return {
      isValid: false,
      message: '組織IDが設定されていません'
    };
  }
  
  if (!isValidUUID(organizationId)) {
    return {
      isValid: false,
      message: '無効な組織ID形式です'
    };
  }
  
  return {
    isValid: true,
    message: ''
  };
};

/**
 * メールアドレスの形式チェック
 * @param {string} email - チェックするメールアドレス
 * @returns {boolean} 有効なメールアドレスの場合true
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 電話番号の形式チェック（日本の電話番号）
 * @param {string} phone - チェックする電話番号
 * @returns {boolean} 有効な電話番号の場合true
 */
export const isValidPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  // 日本の電話番号形式（ハイフンあり・なし両方対応）
  const phoneRegex = /^(\d{2,4}-\d{2,4}-\d{4}|\d{10,11})$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};