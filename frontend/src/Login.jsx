import React, { useState } from 'react';
import axios from 'axios';
import FloatingCharacter from './FloatingCharacter';

const Login = ({ onLogin, onSwitchToRegister, onSwitchToForgotPassword }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:8000/api/auth/login', {
        username,
        password
      });

      const { access_token, user, role } = response.data;
      
      // Save token & user info
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', role);

      onLogin({ user, role, token: access_token });
    } catch (e) {
      setError(e.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <FloatingCharacter />
        <h1 style={styles.title}>🧬 AIClone Login</h1>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={styles.passwordInput}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              style={styles.forgotBtn}
              disabled={loading}
            >
              🔐 Forgot Password?
            </button>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={styles.divider}>Don't have an account?</div>
        <button
          onClick={onSwitchToRegister}
          style={styles.registerButton}
          disabled={loading}
        >
          Create Account
        </button>

        <div style={styles.info}>
          <p style={styles.infoText}>
            <strong> HỆ THỐNG CHAT CỦA NGUYỄN PHƯƠC ĐẠI</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    height: '100vh',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a1a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Segoe UI', sans-serif",
  },
  box: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '50px',
    maxWidth: '450px',
    width: '90%',
    backdropFilter: 'blur(10px)',
  },
  title: {
    textAlign: 'center',
    fontSize: '2.5rem',
    color: 'white',
    marginBottom: '30px',
    background: 'linear-gradient(90deg, #ff9a56, #ff7043)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  form: {
    marginBottom: '30px',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    color: 'white',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
  },
  input: {
    width: '100%',
    padding: '12px 15px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.3s',
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    width: '100%',
    padding: '12px 45px 12px 15px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.3s',
  },
  eyeButton: {
    position: 'absolute',
    right: '10px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotBtn: {
    background: 'transparent',
    color: '#FF6B9D',
    border: 'none',
    fontSize: '12px',
    cursor: 'pointer',
    marginTop: '8px',
    padding: '0',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  button: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #ff9a56 0%, #ff7043 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  error: {
    padding: '12px',
    background: '#FF6B6B',
    color: 'white',
    borderRadius: '8px',
    marginBottom: '15px',
    fontSize: '14px',
    textAlign: 'center',
  },
  divider: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '13px',
    margin: '20px 0 10px 0',
  },
  registerButton: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #44A08D 0%, #4ECDC4 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginBottom: '20px',
  },
  info: {
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: '20px',
  },
  infoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    margin: '8px 0',
  },
};

export default Login;
