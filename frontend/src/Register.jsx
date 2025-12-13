import React, { useState } from 'react';
import axios from 'axios';
import FloatingCharacter from './FloatingCharacter';

const Register = ({ onRegisterSuccess, onBackToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Invalid email format');
      return;
    }

    if (!formData.password) {
      setError('Password is required');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Use new public registration endpoint
      const response = await axios.post('http://localhost:8000/api/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      // Show success message with email confirmation info
      const emailConfirmMsg = response.data.email_sent 
        ? `✅ Account created! Confirmation email sent to ${formData.email}`
        : `✅ Account created! A confirmation email would be sent if email service is configured.`;
      
      setSuccess(emailConfirmMsg);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        onRegisterSuccess();
      }, 2000);

    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Registration failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <FloatingCharacter />
        <h1 style={styles.title}>🧬 Create Account</h1>
        <p style={styles.subtitle}>Join AIClone and chat with AI clones</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              style={styles.input}
              disabled={loading}
            />
            <p style={styles.hint}>Min 3 characters, no spaces</p>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              style={styles.input}
              disabled={loading}
            />
            <p style={styles.hint}>📧 Confirmation email will be sent to this address</p>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min 6 characters"
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="showPassword"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="showPassword" style={styles.checkboxLabel}>
              Show Password
            </label>
          </div>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div style={styles.divider}>
          <span>Already have an account?</span>
        </div>

        <button
          onClick={onBackToLogin}
          style={styles.loginLink}
          disabled={loading}
        >
          Back to Login
        </button>

        <div style={styles.info}>
          <p style={styles.infoTitle}>✨ What you get:</p>
          <ul style={styles.infoList}>
            <li>💬 Chat with AI clones</li>
            <li>🎨 Create your own personal clones</li>
            <li>👥 Connect with other users</li>
            <li>🔐 Secure account with password</li>
          </ul>
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
    marginBottom: '10px',
    background: 'linear-gradient(90deg, #4ECDC4, #44A08D)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '30px',
    fontSize: '14px',
  },
  form: {
    marginBottom: '20px',
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
  hint: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    margin: '5px 0 0 0',
  },
  button: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
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
  success: {
    padding: '12px',
    background: '#27AE60',
    color: 'white',
    borderRadius: '8px',
    marginBottom: '15px',
    fontSize: '14px',
    textAlign: 'center',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  checkboxLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '14px',
    cursor: 'pointer',
  },
  divider: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    marginBottom: '15px',
  },
  loginLink: {
    width: '100%',
    padding: '12px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.3)',
    color: 'white',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginBottom: '30px',
  },
  info: {
    background: 'rgba(78, 205, 196, 0.1)',
    padding: '20px',
    borderRadius: '10px',
    borderLeft: '4px solid #4ECDC4',
  },
  infoTitle: {
    color: '#4ECDC4',
    fontSize: '13px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  infoList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
};

export default Register;
