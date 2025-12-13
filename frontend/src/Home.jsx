import React from 'react';
import './Home.css';

function Home({ onSelectMode, role, user, onLogout }) {
  return (
    <div className="home-container">
      <div className="home-content">
        <div className="home-header">
          <h1 className="home-title">🧬 Human Clone AI</h1>
          <div className="user-info">
            <span className="username">👤 {user?.username}</span>
            <button className="logout-btn" onClick={onLogout}>Đăng Xuất</button>
          </div>
        </div>
        <p className="home-subtitle">Tạo nhân bản AI của chính bạn</p>

        <div className="home-buttons">
          {/* Chat Mode */}
          <div className="mode-card" onClick={() => onSelectMode('chat')}>
            <div className="mode-icon">💬</div>
            <h2>Chat AI</h2>
            <p>Trò chuyện văn bản với AI</p>
            <ul>
              <li>✓ Hỗ trợ tiếng Việt</li>
              <li>✓ Upload ảnh & file</li>
              <li>✓ Lịch sử trò chuyện</li>
            </ul>
            <button className="mode-btn">Mở Chat</button>
          </div>

          {/* Human Clone Mode */}
          <div className="mode-card clone-card" onClick={() => onSelectMode('clone')}>
            <div className="mode-icon">🧬</div>
            <h2>Nhân Bản AI</h2>
            <p>Tạo AI Clone giống hệt bạn</p>
            <ul>
              <li>✓ Học tính cách của bạn</li>
              <li>✓ Nói chuyện như bạn</li>
              <li>✓ Biểu cảm như con người</li>
              <li>✓ Nhớ mọi cuộc trò chuyện</li>
            </ul>
            <button className="mode-btn clone-btn">Tạo Clone</button>
          </div>

          {/* Admin Mode - Show only for superadmin */}
          {role === 'superadmin' && (
            <div className="mode-card admin-card" onClick={() => onSelectMode('admin')}>
              <div className="mode-icon">⚙️</div>
              <h2>Admin</h2>
              <p>Quản lý tất cả AI Clones</p>
              <ul>
                <li>✓ Xem danh sách clones</li>
                <li>✓ Chỉnh sửa clone</li>
                <li>✓ Xóa clone</li>
                <li>✓ Thống kê & phân tích</li>
              </ul>
              <button className="mode-btn admin-btn">Quản Lý</button>
            </div>
          )}
        </div>

        <footer className="home-footer">
          <p>Backend: Groq (Primary) + Gemini (Backup)</p>
        </footer>
      </div>
    </div>
  );
}

export default Home;
