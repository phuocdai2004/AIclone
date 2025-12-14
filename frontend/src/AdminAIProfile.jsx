import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SuperAdminDashboard.css';
import API_URL from './config';

const AdminAIProfile = () => {
  const [profile, setProfile] = useState({
    name: 'AIClone',
    avatar: '🤖',
    status: 'Online',
    description: 'AI version of you - Thô, giỡn, trả trêu, dí dỏm, thân thiện',
    personality: 'Friendly, witty, casual',
    color: '#0066FF'
  });

  const [formData, setFormData] = useState(profile);
  const [message, setMessage] = useState('');
  const [avatarOptions] = useState(['🤖', '🧠', '💻', '⚡', '🔮', '👾', '🎯', '💡', '🚀', '✨']);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/ai-profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProfile(res.data);
      setFormData(res.data);
    } catch (err) {
      console.log('Using default profile');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAvatarSelect = (emoji) => {
    setFormData({ ...formData, avatar: emoji });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/ai-profile`, formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProfile(formData);
      setMessage('✅ AI Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Error updating profile: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(profile);
    setMessage('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      setMessage('❌ Vui lòng chọn file ảnh (JPG, PNG, GIF, WebP...)');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('❌ Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    try {
      setUploading(true);
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);

      const response = await axios.post(`${API_URL}/api/upload/image`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const imageUrl = response.data.url || response.data.file_path;
      setFormData({ ...formData, avatar: imageUrl });
      setMessage('✅ Upload ảnh thành công!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Upload ảnh thất bại: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>🤖 AIClone Profile Management</h2>
        <p>Customize your AI Clone's personality and appearance</p>
      </div>

      {message && (
        <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-error'}`}>
          {message}
        </div>
      )}

      <div className="profile-editor">
        {/* Avatar Selection */}
        <div className="form-group">
          <label>Avatar</label>
          
          {/* Avatar Tabs */}
          <div className="avatar-tabs">
            <button
              type="button"
              className={`tab-btn ${!formData.avatar.startsWith('http') ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, avatar: '🤖' })}
            >
              😊 Emoji
            </button>
            <button
              type="button"
              className={`tab-btn ${formData.avatar.startsWith('http') ? 'active' : ''}`}
              onClick={() => {}}
            >
              🖼️ Image URL
            </button>
          </div>

          {/* Emoji Selection */}
          {!formData.avatar.startsWith('http') && (
            <div className="avatar-grid">
              {avatarOptions.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleAvatarSelect(emoji)}
                  className={`avatar-btn ${formData.avatar === emoji ? 'active' : ''}`}
                  title={emoji}
                >
                  <span className="avatar-emoji">{emoji}</span>
                </button>
              ))}
            </div>
          )}

          {/* Image URL Input */}
          {formData.avatar.startsWith('http') && (
            <div className="image-url-section">
              <input
                type="text"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                placeholder="Enter image URL (JPG, PNG, GIF...)"
                className="form-input"
              />
              <div className="image-preview">
                <img src={formData.avatar} alt="Avatar preview" onError={(e) => e.target.style.display = 'none'} />
              </div>
            </div>
          )}

          {/* File Upload Button */}
          <div style={{marginTop: '15px'}}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{display: 'none'}}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn btn-secondary"
              style={{width: '100%'}}
            >
              {uploading ? '📤 Đang upload...' : '📤 Upload ảnh từ máy tính'}
            </button>
          </div>

          <p className="selected-avatar">Selected: {formData.avatar.startsWith('http') ? 'Image' : formData.avatar}</p>
        </div>

        {/* Name */}
        <div className="form-group">
          <label>AI Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter AI name"
            maxLength="30"
            className="form-input"
          />
        </div>

        {/* Status */}
        <div className="form-group">
          <label>Status</label>
          <select name="status" value={formData.status} onChange={handleChange} className="form-input">
            <option value="Online">🟢 Online</option>
            <option value="Idle">🟡 Idle</option>
            <option value="Offline">⚫ Offline</option>
          </select>
        </div>

        {/* Description */}
        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter AI description"
            rows="3"
            maxLength="200"
            className="form-input"
          />
          <p className="char-count">{formData.description.length}/200</p>
        </div>

        {/* Personality */}
        <div className="form-group">
          <label>Personality Traits</label>
          <textarea
            name="personality"
            value={formData.personality}
            onChange={handleChange}
            placeholder="e.g., Friendly, Witty, Casual, Helpful..."
            rows="3"
            maxLength="200"
            className="form-input"
          />
          <p className="char-count">{formData.personality.length}/200</p>
        </div>

        {/* Color */}
        <div className="form-group">
          <label>Accent Color</label>
          <div className="color-input-group">
            <input
              type="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className="color-picker"
            />
            <span className="color-value">{formData.color}</span>
          </div>
        </div>

        {/* Preview */}
        <div className="form-group preview-section">
          <label>Preview</label>
          <div className="profile-preview" style={{ borderColor: formData.color }}>
            <div className="preview-avatar">
              {formData.avatar.startsWith('http') ? (
                <img src={formData.avatar} alt="AI Avatar" style={{width: '100px', height: '100px', borderRadius: '8px', objectFit: 'cover'}} onError={(e) => e.target.style.display = 'none'} />
              ) : (
                formData.avatar
              )}
            </div>
            <div className="preview-info">
              <h3>{formData.name}</h3>
              <p className="preview-status">{formData.status}</p>
              <p className="preview-description">{formData.description}</p>
              <p className="preview-personality">
                <strong>Personality:</strong> {formData.personality}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? '💾 Saving...' : '💾 Save Changes'}
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            className="btn btn-secondary"
          >
            ↩️ Reset
          </button>
        </div>

        {/* Current Profile Info */}
        <div className="current-profile">
          <h4>Current Profile</h4>
          <div className="profile-info">
            <p><strong>Name:</strong> {profile.name}</p>
            <p><strong>Avatar:</strong> 
              {profile.avatar.startsWith('http') ? (
                <img src={profile.avatar} alt="Avatar" style={{width: '40px', height: '40px', borderRadius: '4px', marginLeft: '5px', objectFit: 'cover'}} onError={(e) => e.target.style.display = 'none'} />
              ) : (
                <span style={{fontSize: '1.2em', marginLeft: '5px'}}>{profile.avatar}</span>
              )}
            </p>
            <p><strong>Status:</strong> {profile.status}</p>
            <p><strong>Description:</strong> {profile.description}</p>
            <p><strong>Personality:</strong> {profile.personality}</p>
            <p><strong>Color:</strong> <span style={{backgroundColor: profile.color, padding: '2px 8px', borderRadius: '4px', color: 'white'}}>{profile.color}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAIProfile;
