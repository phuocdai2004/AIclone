import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SuperAdminDashboard.css';
import AdminAIProfile from './AdminAIProfile';

const SuperAdminDashboard = ({ user, onLogout, onSelectMode }) => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClones: 0,
    activeUsers: 0,
    totalConversations: 0
  });
  const [users, setUsers] = useState([]);
  const [clones, setClones] = useState([]);
  const [allQueries, setAllQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userQueries, setUserQueries] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Load users
      const usersRes = await axios.get('http://localhost:8000/api/users/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUsers(usersRes.data);

      // Load clones
      const clonesRes = await axios.get('http://localhost:8000/api/clones/');
      setClones(clonesRes.data);

      // Load all queries
      const queriesRes = await axios.get('http://localhost:8000/api/admin/all-queries');
      setAllQueries(queriesRes.data.queries || []);

      // Calculate stats
      setStats({
        totalUsers: usersRes.data.length,
        totalClones: clonesRes.data.length,
        activeUsers: usersRes.data.filter(u => u.is_active).length,
        totalConversations: queriesRes.data.total || 0
      });

      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setLoading(false);
    }
  };

  const loadUserQueries = async (username) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/admin/user-queries/${username}`);
      setUserQueries(res.data.queries || []);
      setSelectedUser(username);
    } catch (err) {
      console.error('Error loading user queries:', err);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({ username: '', email: '', password: '', role: 'user' });
    setShowAddUserModal(true);
  };

  const handleEditUser = (userObj) => {
    setEditingUser(userObj);
    setFormData({
      username: userObj.username,
      email: userObj.email,
      password: '',
      role: userObj.role
    });
    setShowAddUserModal(true);
  };

  const handleSaveUser = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (editingUser) {
        // Update existing user
        await axios.put(
          `http://localhost:8000/api/users/${editingUser.id}`,
          formData,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } else {
        // Create new user
        await axios.post(
          'http://localhost:8000/api/users/register',
          formData,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      }
      
      setShowAddUserModal(false);
      loadDashboardData();
    } catch (err) {
      alert('Error saving user: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Xoá user "${username}"? Thao tác này không thể hoàn tác.`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:8000/api/users/${userId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      loadDashboardData();
    } catch (err) {
      alert('Error deleting user: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleLock = async (userId, username, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:8000/api/users/${userId}/toggle-status`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      loadDashboardData();
    } catch (err) {
      alert('Error toggling user status: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="superadmin-container">
      {/* Header */}
      <div className="superadmin-header">
        <div className="header-title">
          <h1>⚡ SUPERADMIN CONTROL PANEL</h1>
          <p>System Management & Analytics</p>
        </div>
        <div className="header-user">
          <span>{user?.username}</span>
          <button onClick={onLogout} className="logout-btn">Đăng Xuất</button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="superadmin-nav">
        <button 
          className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics
        </button>
        <button 
          className={`nav-tab ${activeTab === 'ai_profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai_profile')}
        >
          🤖 AIClone Profile
        </button>
        <button 
          className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button 
          className={`nav-tab ${activeTab === 'clones' ? 'active' : ''}`}
          onClick={() => setActiveTab('clones')}
        >
          🤖 Clones
        </button>
        <button 
          className={`nav-tab ${activeTab === 'queries' ? 'active' : ''}`}
          onClick={() => setActiveTab('queries')}
        >
          💬 User Queries
        </button>
        <button 
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Content Area */}
      <div className="superadmin-content">
        {/* AIClone Profile Tab */}
        {activeTab === 'ai_profile' && (
          <AdminAIProfile />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="analytics-section">
            <h2>System Analytics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>Total Users</h3>
                  <p className="stat-number">{stats.totalUsers}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🤖</div>
                <div className="stat-info">
                  <h3>Total Clones</h3>
                  <p className="stat-number">{stats.totalClones}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <h3>Active Users</h3>
                  <p className="stat-number">{stats.activeUsers}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💬</div>
                <div className="stat-info">
                  <h3>Total Conversations</h3>
                  <p className="stat-number">{stats.totalConversations}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="users-section">
            <div className="users-header">
              <h2>User Management</h2>
              <button 
                onClick={handleAddUser}
                className="add-user-btn"
              >
                ➕ Add User
              </button>
            </div>
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td><strong>{u.username}</strong></td>
                      <td>{u.email}</td>
                      <td><span className="role-badge">{u.role}</span></td>
                      <td>
                        <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                          {u.is_active ? 'Active' : 'Locked'}
                        </span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        <button 
                          onClick={() => loadUserQueries(u.username)}
                          className="view-btn"
                          title="View user queries"
                        >
                          👁️
                        </button>
                        <button 
                          onClick={() => handleEditUser(u)}
                          className="edit-btn"
                          title="Edit user"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleToggleLock(u.id, u.username, u.is_active)}
                          className={u.is_active ? "lock-btn" : "unlock-btn"}
                          title={u.is_active ? "Lock user" : "Unlock user"}
                        >
                          {u.is_active ? '🔓' : '🔒'}
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          className="delete-btn"
                          title="Delete user"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Clones Tab */}
        {activeTab === 'clones' && (
          <div className="clones-section">
            <h2>Clone Management</h2>
            <div className="clones-table">
              <table>
                <thead>
                  <tr>
                    <th>Clone Name</th>
                    <th>Created By</th>
                    <th>Conversations</th>
                    <th>Created Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clones.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.created_by || 'System'}</td>
                      <td>{c.memories_count || 0}</td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="edit-btn">View</button>
                        <button className="delete-btn">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="settings-section">
            <h2>System Settings</h2>
            <div className="settings-group">
              <div className="setting-item">
                <h3>API Configuration</h3>
                <p>Groq API: Configured</p>
                <p>Gemini API: Configured</p>
              </div>
              <div className="setting-item">
                <h3>Database</h3>
                <p>MongoDB Atlas: Connected</p>
                <p>Collections: users, clones</p>
              </div>
              <div className="setting-item">
                <h3>System Status</h3>
                <p style={{ color: '#27AE60' }}>✓ All Systems Operational</p>
              </div>
            </div>
          </div>
        )}

        {/* User Queries Tab */}
        {activeTab === 'queries' && (
          <div className="queries-section">
            <h2>📋 Tất cả câu hỏi từ User ({allQueries.length})</h2>
            <div className="queries-search">
              <input
                type="text"
                placeholder="Tìm kiếm câu hỏi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="queries-list">
              {allQueries
                .filter(q => q.query.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((query, idx) => (
                  <div key={idx} className="query-item">
                    <div className="query-content">
                      <p className="query-text">💬 {query.query}</p>
                      <p className="query-time">⏰ {query.date}</p>
                    </div>
                  </div>
                ))}
              {allQueries.filter(q => q.query.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <p className="no-queries">Không có câu hỏi nào</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Queries Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Câu hỏi của {selectedUser}</h2>
              <button 
                onClick={() => setSelectedUser(null)}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <div className="queries-modal-list">
              {userQueries.length > 0 ? (
                userQueries.map((query, idx) => (
                  <div key={idx} className="query-row">
                    <div className="query-header">
                      <span className="query-num">#{idx + 1}</span>
                      <span className="query-date">⏰ {query.date}</span>
                    </div>
                    <div className="query-body">
                      <div className="query-section">
                        <p className="section-label">❓ Câu hỏi:</p>
                        <p className="section-text">{query.query}</p>
                      </div>
                      <div className="query-section">
                        <p className="section-label">💡 Trả lời:</p>
                        <p className="section-text">{query.response}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-queries">User này chưa hỏi câu hỏi nào</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal-content add-user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? '✏️ Edit User' : '➕ Add New User'}</h2>
              <button 
                onClick={() => setShowAddUserModal(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="Enter username"
                disabled={!!editingUser}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Enter email"
              />
            </div>

            <div className="form-group">
              <label>Password {editingUser && '(leave empty to keep current)'}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder={editingUser ? "Leave empty to keep current password" : "Enter password"}
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setShowAddUserModal(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveUser}
                className="save-btn"
              >
                {editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
