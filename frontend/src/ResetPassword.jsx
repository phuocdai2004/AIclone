import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ResetPassword.css';
import FloatingCharacter from './FloatingCharacter';

const ResetPassword = ({ onResetSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Extract token from URL query parameter
  const getTokenFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  };

  const token = getTokenFromUrl();

  useEffect(() => {
    if (!token) {
      setError('❌ Link không hợp lệ hoặc đã hết hạn');
    }
  }, [token]);

  // Calculate password strength
  useEffect(() => {
    if (newPassword.length === 0) {
      setPasswordStrength(0);
    } else {
      let strength = 0;
      if (newPassword.length >= 6) strength += 25;
      if (newPassword.length >= 10) strength += 25;
      if (/[a-z]/.test(newPassword)) strength += 15;
      if (/[A-Z]/.test(newPassword)) strength += 15;
      if (/[0-9]/.test(newPassword)) strength += 10;
      if (/[!@#$%^&*]/.test(newPassword)) strength += 10;
      setPasswordStrength(Math.min(strength, 100));
    }
  }, [newPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword) {
      setError('Vui lòng nhập mật khẩu mới');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu phải ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu không trùng khớp');
      return;
    }

    setLoading(true);

    try {
      await axios.post('http://localhost:8000/api/auth/reset-password', {
        token: token,
        new_password: newPassword
      });

      setSuccess('✅ Mật khẩu đã được đặt lại thành công!');

      setTimeout(() => {
        onResetSuccess();
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 25) return 'Yếu';
    if (passwordStrength < 50) return 'Vừa';
    if (passwordStrength < 75) return 'Khá';
    return 'Mạnh';
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 25) return '#FF6B6B';
    if (passwordStrength < 50) return '#FFD93D';
    if (passwordStrength < 75) return '#6BCB77';
    return '#4ECDC4';
  };

  if (!token) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-box">
          <div className="reset-password-header error-header">
            <h1>❌ Link Không Hợp Lệ</h1>
          </div>
          <div className="reset-password-content">
            <p className="error-message">Link reset mật khẩu không hợp lệ hoặc đã hết hạn (24 giờ)</p>
            <button 
              onClick={() => window.location.href = '/login'}
              className="btn-back"
            >
              ← Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-box">
        <FloatingCharacter />
        {/* Header */}
        <div className="reset-password-header">
          <h1>🔑 Đặt Lại Mật Khẩu</h1>
        </div>

        {/* Content */}
        <div className="reset-password-content">
          {success ? (
            <div className="reset-success">
              <div className="success-icon">✅</div>
              <h2>Mật khẩu đã được đặt lại!</h2>
              <p>Bạn sẽ được chuyển hướng đến trang đăng nhập trong vài giây</p>
              <button 
                onClick={onResetSuccess}
                className="btn-primary"
              >
                → Đăng nhập ngay
              </button>
            </div>
          ) : (
            <>
              <p className="reset-subtitle">
                Nhập mật khẩu mới của bạn
              </p>

              <form onSubmit={handleSubmit} className="reset-form">
                {/* Password Input */}
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">🔒</span>
                    Mật khẩu mới
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                      className="form-input"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {newPassword && (
                    <div className="password-strength">
                      <div className="strength-bar">
                        <div 
                          className="strength-fill"
                          style={{
                            width: `${passwordStrength}%`,
                            backgroundColor: getPasswordStrengthColor()
                          }}
                        ></div>
                      </div>
                      <span className="strength-label">
                        Độ mạnh: <strong style={{ color: getPasswordStrengthColor() }}>
                          {getPasswordStrengthLabel()}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">🔒</span>
                    Xác nhận mật khẩu
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="form-input"
                    disabled={loading}
                  />
                  {confirmPassword && newPassword === confirmPassword && (
                    <p className="success-text">✓ Mật khẩu trùng khớp</p>
                  )}
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="error-text">✗ Mật khẩu không trùng khớp</p>
                  )}
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || !newPassword || !confirmPassword}
                >
                  {loading ? '⏳ Đang cập nhật...' : '✅ Đặt lại mật khẩu'}
                </button>
              </form>

              <div className="password-requirements">
                <h3>📋 Yêu cầu mật khẩu:</h3>
                <ul>
                  <li className={newPassword.length >= 6 ? 'met' : ''}>
                    {newPassword.length >= 6 ? '✓' : '○'} Ít nhất 6 ký tự
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? 'met' : ''}>
                    {/[A-Z]/.test(newPassword) ? '✓' : '○'} Chứa chữ hoa (A-Z)
                  </li>
                  <li className={/[a-z]/.test(newPassword) ? 'met' : ''}>
                    {/[a-z]/.test(newPassword) ? '✓' : '○'} Chứa chữ thường (a-z)
                  </li>
                  <li className={/[0-9]/.test(newPassword) ? 'met' : ''}>
                    {/[0-9]/.test(newPassword) ? '✓' : '○'} Chứa số (0-9)
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
