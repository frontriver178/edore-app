import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { handleError, parseError } from '../utils/errorHandler';

const SignUpPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { clearError } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    if (!email || !password || !confirmPassword) {
      setError('全ての項目を入力してください');
      return false;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return false;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('有効なメールアドレスを入力してください');
      return false;
    }

    return true;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    clearError();

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        const parsedError = parseError(error);
        setError(parsedError.message);
        handleError(error, 'SignUp', { email });
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/register');
        }, 2000);
      }
    } catch (err) {
      const parsedError = handleError(err, 'SignUp Exception', { email });
      setError(parsedError.message);
    } finally {
      setLoading(false);
    }
  };



  if (success) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', minWidth: '400px', textAlign: 'center' }}>
          <h2 style={{ color: '#4CAF50', marginBottom: '1rem' }}>🎉 サインアップ完了！</h2>
          <p style={{ marginBottom: '1rem' }}>
            アカウントが正常に作成されました。<br />
            ログインして登録を完了してください。
          </p>
          <Button 
            onClick={() => navigate('/login')}
            variant="primary"
            style={{ width: '100%' }}
          >
            ログインページへ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-header">Edore サインアップ</h2>
        
        {error && (
          <div className="auth-message error">
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="auth-form">
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
          
          <div className="auth-form-group">
            <input
              type="password"
              placeholder="パスワード（6文字以上）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-form-input"
            />
          </div>

          <div className="auth-form-group last">
            <input
              type="password"
              placeholder="パスワード（確認用）"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            サインアップ
          </Button>
        </form>

        <div className="auth-footer">
          <p className="auth-footer-text">
            すでにアカウントをお持ちですか？{' '}
            <button 
              onClick={() => navigate('/login')}
              className="auth-link"
            >
              ログインはこちら
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage; 