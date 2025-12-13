import React, { useState } from 'react';
import axios from 'axios';
import './ForgotPassword.css';
import FloatingCharacter from './FloatingCharacter';

const ForgotPassword = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState('email'); // email or sent

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email không hợp lệ');
      return;
    }

    setLoading(true);

    try {
      await axios.post('http://localhost:8000/api/auth/forgot-password', {
        email: email.trim()
      });

      setStep('sent');
      setSuccess('✅ Link reset mật khẩu đã được gửi!');

    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi gửi link reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        <FloatingCharacter />
        {/* Header */}
        <div className="forgot-password-header">
          <button 
            className="back-btn-header"
            onClick={onBackToLogin}
            title="Quay lại"
          >
            ←
          </button>
          <h1>🔐 Lấy Lại Mật Khẩu</h1>
          <div style={{ width: '40px' }}></div>
        </div>

        {/* Content */}
        {step === 'email' ? (
          <>
            <div className="forgot-password-content">
              <p className="forgot-password-subtitle">
                Nhập email của bạn và chúng tôi sẽ gửi link để đặt lại mật khẩu
              </p>

              <form onSubmit={handleSubmit} className="forgot-password-form">
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    <span className="label-icon">📧</span>
                    Email đăng ký
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="form-input"
                    disabled={loading}
                  />
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? '⏳ Đang gửi...' : '📨 Gửi link reset'}
                </button>
              </form>

              <div className="info-box">
                <h3>ℹ️ Thông tin</h3>
                <ul>
                  <li>Link reset sẽ được gửi trong vài giây</li>
                  <li>Link hợp lệ trong 24 giờ</li>
                  <li>Kiểm tra cả thư mục spam nếu không thấy</li>
                </ul>
              </div>
            </div>

            <button 
              className="btn-back"
              onClick={onBackToLogin}
              disabled={loading}
            >
              ← Quay lại đăng nhập
            </button>
          </>
        ) : (
          <>
            <div className="forgot-password-success">
              <div className="success-icon">✉️</div>
              <h2>Email đã được gửi!</h2>
              <p className="success-message">
                Chúng tôi đã gửi link đặt lại mật khẩu đến:
              </p>
              <p className="success-email">{email}</p>
              
              <div className="success-steps">
                <h3>📋 Các bước tiếp theo:</h3>
                <ol>
                  <li>Kiểm tra email của bạn</li>
                  <li>Nhấp vào link "Đặt lại mật khẩu"</li>
                  <li>Nhập mật khẩu mới của bạn</li>
                  <li>Đăng nhập với mật khẩu mới</li>
                </ol>
              </div>

              <div className="warning-box">
                <p>⚠️ <strong>Không thấy email?</strong></p>
                <p>Kiểm tra thư mục spam hoặc promotions</p>
              </div>
            </div>

            <button 
              className="btn-back"
              onClick={onBackToLogin}
            >
              ← Quay lại đăng nhập
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
