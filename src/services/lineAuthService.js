/**
 * LINE認証サービス
 * LINE LoginとLIFFを使用した認証機能
 */

class LineAuthService {
  constructor() {
    this.channelId = process.env.REACT_APP_LINE_LOGIN_CHANNEL_ID;
    this.callbackUrl = process.env.REACT_APP_LINE_LOGIN_CALLBACK_URL;
    this.liffId = process.env.REACT_APP_LIFF_ID;
    this.isLiffEnvironment = false;
    this.liff = null;
  }

  /**
   * LIFFの初期化
   */
  async initializeLIFF() {
    if (!this.liffId) {
      console.warn('LIFF ID が設定されていません');
      return false;
    }

    try {
      // LIFF SDKの動的読み込み
      if (!window.liff) {
        await this.loadLIFFSDK();
      }

      await window.liff.init({ liffId: this.liffId });
      this.liff = window.liff;
      this.isLiffEnvironment = window.liff.isInClient();
      
      console.log('LIFF初期化成功:', {
        isInClient: this.isLiffEnvironment,
        isLoggedIn: window.liff.isLoggedIn(),
        liffId: this.liffId
      });

      return true;
    } catch (error) {
      console.error('LIFF初期化エラー:', error);
      return false;
    }
  }

  /**
   * LIFF SDKの動的読み込み
   */
  async loadLIFFSDK() {
    return new Promise((resolve, reject) => {
      if (window.liff) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('LIFF SDK読み込みエラー'));
      document.head.appendChild(script);
    });
  }

  /**
   * LINE環境の確認
   */
  isLIFFEnvironment() {
    return this.isLiffEnvironment;
  }

  /**
   * LINEログイン状態の確認
   */
  isLoggedIn() {
    if (this.liff) {
      return this.liff.isLoggedIn();
    }
    return false;
  }

  /**
   * LINEログインの実行
   */
  async loginWithLine() {
    try {
      if (this.isLiffEnvironment && this.liff) {
        // LIFF環境でのログイン
        if (!this.liff.isLoggedIn()) {
          await this.liff.login();
        }
        return await this.getLIFFProfile();
      } else {
        // Web環境でのLINE Login
        return this.redirectToLineLogin();
      }
    } catch (error) {
      console.error('LINEログインエラー:', error);
      throw error;
    }
  }

  /**
   * Web環境でのLINE Loginリダイレクト
   */
  redirectToLineLogin() {
    if (!this.channelId) {
      throw new Error('LINE Login Channel ID が設定されていません');
    }

    const state = this.generateState();
    const nonce = this.generateNonce();
    
    // セッションストレージに保存
    sessionStorage.setItem('line_auth_state', state);
    sessionStorage.setItem('line_auth_nonce', nonce);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.channelId,
      redirect_uri: this.callbackUrl,
      state: state,
      scope: 'profile openid',
      nonce: nonce,
      bot_prompt: 'aggressive' // ボット友達追加を促進
    });

    const authUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
    window.location.href = authUrl;
  }

  /**
   * LIFF環境でのプロフィール取得
   */
  async getLIFFProfile() {
    if (!this.liff || !this.liff.isLoggedIn()) {
      throw new Error('LIFFにログインしていません');
    }

    try {
      const profile = await this.liff.getProfile();
      const idToken = this.liff.getIDToken();
      
      return {
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        statusMessage: profile.statusMessage,
        idToken: idToken,
        source: 'liff'
      };
    } catch (error) {
      console.error('LIFFプロフィール取得エラー:', error);
      throw error;
    }
  }

  /**
   * LINE Login コールバック処理
   */
  async handleLineLoginCallback(code, state) {
    try {
      // state検証
      const savedState = sessionStorage.getItem('line_auth_state');
      if (state !== savedState) {
        throw new Error('State parameter mismatch');
      }

      // アクセストークン取得
      const tokenResponse = await this.getAccessToken(code);
      
      // プロフィール取得
      const profile = await this.getProfileWithToken(tokenResponse.access_token);
      
      // IDトークンの検証（OpenID Connect）
      if (tokenResponse.id_token) {
        const idTokenPayload = await this.verifyIDToken(tokenResponse.id_token);
        profile.idTokenPayload = idTokenPayload;
      }

      // セッションストレージをクリア
      sessionStorage.removeItem('line_auth_state');
      sessionStorage.removeItem('line_auth_nonce');

      return {
        ...profile,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        idToken: tokenResponse.id_token,
        source: 'web'
      };
    } catch (error) {
      console.error('LINE Loginコールバック処理エラー:', error);
      throw error;
    }
  }

  /**
   * アクセストークン取得
   */
  async getAccessToken(code) {
    const response = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.callbackUrl,
        client_id: this.channelId,
        client_secret: process.env.REACT_APP_LINE_CHANNEL_SECRET
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Token取得エラー: ${errorData.error_description || errorData.error}`);
    }

    return await response.json();
  }

  /**
   * プロフィール取得（アクセストークン使用）
   */
  async getProfileWithToken(accessToken) {
    const response = await fetch('https://api.line.me/v2/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('プロフィール取得エラー');
    }

    return await response.json();
  }

  /**
   * IDトークンの検証
   */
  async verifyIDToken(idToken) {
    try {
      // JWT payloadをデコード（本番環境では署名検証も必要）
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      
      // 基本的な検証
      const savedNonce = sessionStorage.getItem('line_auth_nonce');
      if (payload.nonce !== savedNonce) {
        throw new Error('Nonce mismatch');
      }

      return payload;
    } catch (error) {
      console.error('IDトークン検証エラー:', error);
      throw error;
    }
  }

  /**
   * LINEログアウト
   */
  async logout() {
    try {
      if (this.liff && this.liff.isLoggedIn()) {
        this.liff.logout();
      }
      
      // ローカルストレージとセッションストレージをクリア
      localStorage.removeItem('line_auth_data');
      sessionStorage.removeItem('line_auth_state');
      sessionStorage.removeItem('line_auth_nonce');
      
      console.log('LINEログアウト完了');
    } catch (error) {
      console.error('LINEログアウトエラー:', error);
    }
  }

  /**
   * LIFF画面を閉じる
   */
  closeLIFF() {
    if (this.liff && this.isLiffEnvironment) {
      this.liff.closeWindow();
    }
  }

  /**
   * 外部ブラウザで開く
   */
  openExternalBrowser(url) {
    if (this.liff && this.isLiffEnvironment) {
      this.liff.openWindow({
        url: url,
        external: true
      });
    } else {
      window.open(url, '_blank');
    }
  }

  /**
   * ランダムなstate生成
   */
  generateState() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * ランダムなnonce生成
   */
  generateNonce() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * LINE認証データをローカルストレージに保存
   */
  saveAuthData(authData) {
    try {
      const dataToSave = {
        ...authData,
        timestamp: Date.now()
      };
      localStorage.setItem('line_auth_data', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('認証データ保存エラー:', error);
    }
  }

  /**
   * ローカルストレージから認証データを取得
   */
  getStoredAuthData() {
    try {
      const data = localStorage.getItem('line_auth_data');
      if (!data) return null;

      const authData = JSON.parse(data);
      
      // 24時間以上古いデータは削除
      if (Date.now() - authData.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('line_auth_data');
        return null;
      }

      return authData;
    } catch (error) {
      console.error('認証データ取得エラー:', error);
      localStorage.removeItem('line_auth_data');
      return null;
    }
  }

  /**
   * 設定状況の確認
   */
  getConfigStatus() {
    return {
      channelId: !!this.channelId,
      callbackUrl: !!this.callbackUrl,
      liffId: !!this.liffId,
      ready: !!(this.channelId && this.callbackUrl)
    };
  }
}

// シングルトンインスタンス
const lineAuthService = new LineAuthService();

export default lineAuthService;
export { LineAuthService };