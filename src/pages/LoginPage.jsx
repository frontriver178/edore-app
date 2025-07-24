import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import LineLoginButton from '../components/LineLoginButton';
import { handleError, parseError } from '../utils/errorHandler';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { clearError } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    clearError();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const parsedError = parseError(error);
        setError(parsedError.message);
        handleError(error, 'Login', { email });
      } else {
        // 初回ログイン時はオンボーディングページにリダイレクト
        navigate('/onboarding');
      }
    } catch (err) {
      const parsedError = handleError(err, 'Login Exception', { email });
      setError(parsedError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLineLoginSuccess = (lineProfile) => {
    console.log('LINEログイン成功:', lineProfile);
    // LINE認証後はコールバックページで処理されるため、ここでは特に何もしない
  };

  const handleLineLoginError = (error) => {
    console.error('LINEログインエラー:', error);
    setError('LINEログインに失敗しました: ' + error.message);
  };



  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-header">Edore ログイン</h2>
        
        {error && (
          <div className="auth-message error">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-form-group">
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-form-input"
            />
          </div>
          
          <div className="auth-form-group last">
            <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-form-input"
            />
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            disabled={loading}
            loading={loading}
            className="auth-button primary"
          >
            ログイン
          </Button>
        </form>

        {/* LINE Login */}
        <div className="auth-divider">
          <span>または</span>
        </div>

        <div className="line-login-section">
          <LineLoginButton
            onSuccess={handleLineLoginSuccess}
            onError={handleLineLoginError}
            variant="line"
            size="default"
            className="w-full"
          />
        </div>

        <div className="auth-footer">
          <p className="auth-footer-text">
            アカウントをお持ちでない方は{' '}
            <button 
              onClick={() => navigate('/signup')}
              className="auth-link"
            >
              サインアップはこちら
            </button>
          </p>
          <p className="auth-footer-text text-sm text-gray-500 mt-2">
            LINEログインには招待コードが必要です
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
 