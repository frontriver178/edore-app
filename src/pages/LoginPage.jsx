import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      navigate('/students');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', minWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>Edore ログイン</h2>
        
        {error && (
          <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', background: '#ffebee', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
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
          
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            disabled={loading}
            loading={loading}
            style={{ width: '100%' }}
          >
            ログイン
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            アカウントをお持ちでない方は{' '}
            <button 
              onClick={() => navigate('/signup')}
              style={{ color: '#4CAF50', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
            >
              サインアップはこちら
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
 