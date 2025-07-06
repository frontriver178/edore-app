import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

const SignUpPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        navigate('/register');
      }, 2000);
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', minWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>Edore サインアップ</h2>
        
        {error && (
          <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', background: '#ffebee', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp}>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="password"
              placeholder="パスワード（6文字以上）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="password"
              placeholder="パスワード（確認用）"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            disabled={loading}
            loading={loading}
            style={{ width: '100%', marginBottom: '1rem' }}
          >
            サインアップ
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            すでにアカウントをお持ちですか？{' '}
            <button 
              onClick={() => navigate('/login')}
              style={{ color: '#4CAF50', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
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