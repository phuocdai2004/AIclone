import React, { useState, useEffect } from 'react';
import SuperAdminDashboard from './SuperAdminDashboard';
import Chat from './Chat';
import HumanClone from './HumanClone';
import Admin from './Admin';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import UserHome from './UserHome';
import './App.css';
import './AuthAnimation.css';

function App() {
  const [mode, setMode] = useState('login'); // Start with login, not 'home'
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [prevMode, setPrevMode] = useState(null);
  const [characterAnim, setCharacterAnim] = useState('');
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedRole = localStorage.getItem('role');
    
    if (token && savedUser && savedRole) {
      setIsLoggedIn(true);
      setUser(JSON.parse(savedUser));
      setRole(savedRole);
      setMode('home'); // Set mode to 'home' khi user đã logged in
    }
  }, []);

  const handleLogin = ({ user, role, token }) => {
    setIsLoggedIn(true);
    setUser(user);
    setRole(role);
    setMode('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    setIsLoggedIn(false);
    setUser(null);
    setRole(null);
    setMode('login');
  };

  // Handle mode changes with animation
  const handleModeChange = (newMode) => {
    if (mode === 'login' && newMode === 'register') {
      setCharacterAnim('character-run-right');
    } else if (mode === 'register' && newMode === 'login') {
      setCharacterAnim('character-run-left');
    } else if (mode === 'login' && newMode === 'forgot-password') {
      setCharacterAnim('character-run-right');
    } else if ((mode === 'forgot-password' || mode === 'reset-password') && newMode === 'login') {
      setCharacterAnim('character-run-left');
    }
    
    setPrevMode(mode);
    setTimeout(() => {
      setMode(newMode);
      setCharacterAnim('character-idle');
    }, 300);
  };

  // If not logged in, show login/register page
  if (!isLoggedIn) {
    return (
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>

        {mode === 'register' && (
          <Register
            onRegisterSuccess={() => {
              handleModeChange('login');
            }}
            onBackToLogin={() => {
              handleModeChange('login');
            }}
          />
        )}
        {mode === 'forgot-password' && (
          <ForgotPassword
            onBackToLogin={() => {
              handleModeChange('login');
            }}
          />
        )}
        {mode === 'reset-password' && (
          <ResetPassword
            onResetSuccess={() => {
              handleModeChange('login');
            }}
          />
        )}
        {(mode === 'login' || mode === undefined) && (
          <Login
            onLogin={handleLogin}
            onSwitchToRegister={() => {
              handleModeChange('register');
            }}
            onSwitchToForgotPassword={() => {
              handleModeChange('forgot-password');
            }}
          />
        )}
      </div>
    );
  }

  // Role-based routing
  // Superadmin → Full Admin Dashboard (SuperAdminDashboard)
  // User → User Home (chat, personal clones)
  if (role === 'superadmin') {
    return (
      <>
        {mode === 'home' && <SuperAdminDashboard user={user} onLogout={handleLogout} onSelectMode={setMode} />}
        {mode === 'admin' && <Admin user={user} onLogout={handleLogout} />}
        {mode === 'chat' && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMode('home')}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                zIndex: 1000,
                background: 'linear-gradient(135deg, #ff9a56 0%, #ff7043 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
              }}
            >
              ← Quay lại
            </button>
            <Chat />
          </div>
        )}
        {mode === 'clone' && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMode('home')}
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                zIndex: 1000,
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.2)',
                padding: '10px 20px',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ← Trang chủ
            </button>
            <HumanClone />
          </div>
        )}
      </>
    );
  }

  // User view
  return (
    <>
      {mode === 'home' && <UserHome user={user} role={role} onLogout={handleLogout} />}
      {mode === 'clone' && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMode('home')}
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              zIndex: 1000,
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.2)',
              padding: '10px 20px',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← Trang chủ
          </button>
          <HumanClone />
        </div>
      )}
    </>
  );
}

export default App;
