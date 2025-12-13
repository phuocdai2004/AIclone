import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminUsers from './AdminUsers';

const Admin = () => {
  const [tab, setTab] = useState('clones'); // 'clones' or 'users'
  const [clones, setClones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClone, setSelectedClone] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmotion, setFilterEmotion] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const API_URL = 'http://localhost:8000';

  // Load clones from MySQL via API
  useEffect(() => {
    loadClones();
  }, []);

  const loadClones = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/clones/`);
      setClones(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading clones:', error);
      // Fallback to localStorage
      try {
        const storedClones = localStorage.getItem('AIClones');
        if (storedClones) {
          setClones(JSON.parse(storedClones));
        }
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
      setLoading(false);
    }
  };

  // Delete clone from MySQL
  const deleteClone = async (id) => {
    if (window.confirm('Bạn chắc chắn muốn xóa clone này?')) {
      try {
        await axios.delete(`${API_URL}/api/clones/${id}`);
        setClones(clones.filter(c => c.id !== id));
        setSelectedClone(null);
        setEditMode(false);
      } catch (error) {
        console.error('Error deleting clone:', error);
        alert('Lỗi khi xóa clone');
      }
    }
  };

  // Update clone in MySQL
  const updateClone = async (id, updatedData) => {
    try {
      const response = await axios.put(`${API_URL}/api/clones/${id}`, updatedData);
      setClones(clones.map(c => (c.id === id ? response.data : c)));
      setSelectedClone(response.data);
      setEditMode(false);
    } catch (error) {
      console.error('Error updating clone:', error);
      alert('Lỗi khi cập nhật clone');
    }
  };

  // Filter & sort clones
  const filtered = clones
    .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'date') return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });

  if (loading) {
    return <div style={styles.fullScreen}><p>Loading...</p></div>;
  }

  return (
    <div style={styles.adminContainer}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🧬 Admin Dashboard</h1>
        <button
          onClick={() => window.location.href = '/'}
          style={styles.backBtn}
        >
          ← Quay lại Home
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setTab('clones')}
          style={{
            ...styles.tab,
            background: tab === 'clones' ? '#ff7043' : 'rgba(255,255,255,0.1)',
            color: 'white',
          }}
        >
          🧬 Quản lý Clones
        </button>
        <button
          onClick={() => setTab('users')}
          style={{
            ...styles.tab,
            background: tab === 'users' ? '#4ECDC4' : 'rgba(255,255,255,0.1)',
            color: 'white',
          }}
        >
          👥 Quản lý Users
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'clones' ? (
      <div style={styles.content}>
        {/* Left Panel - List */}
        <div style={styles.leftPanel}>
          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="🔍 Tìm clone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.controls}>
            <div style={styles.controlGroup}>
              <label style={styles.label}>Sắp xếp:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={styles.select}
              >
                <option value="name">Theo tên</option>
                <option value="date">Theo ngày tạo</option>
              </select>
            </div>
          </div>

          <div style={styles.clonesList}>
            <h3 style={styles.listTitle}>Danh sách ({filtered.length})</h3>
            {filtered.length === 0 ? (
              <p style={styles.emptyText}>Chưa có clone nào</p>
            ) : (
              filtered.map((clone, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedClone({ ...clone });
                    setEditMode(false);
                  }}
                  style={{
                    ...styles.cloneCard,
                    background: selectedClone?.id === clone.id ? '#ff7043' : 'rgba(255,255,255,0.05)',
                    borderColor: selectedClone?.id === clone.id ? '#ff7043' : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={styles.cloneCardHeader}>
                    <span style={styles.cloneName}>{clone.name || 'Unnamed'}</span>
                    <span style={styles.cloneIcon}>🧬</span>
                  </div>
                  <div style={styles.cloneCardInfo}>
                    <span style={styles.infoLabel}>📝 {clone.personality_count || 0} câu hỏi</span>
                    <span style={styles.infoDot}>•</span>
                    <span style={styles.infoLabel}>📅 {new Date(clone.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Details */}
        <div style={styles.rightPanel}>
          {selectedClone ? (
            <div>
              <div style={styles.detailHeader}>
                <h2>{selectedClone.name || 'Unnamed Clone'}</h2>
                <button
                  onClick={() => setEditMode(!editMode)}
                  style={{...styles.editBtn, background: editMode ? '#ff7043' : '#4ECDC4'}}
                >
                  {editMode ? '✓ Lưu' : '✏️ Chỉnh sửa'}
                </button>
              </div>

              {/* Face Preview */}
              {selectedClone.faceImage && (
                <div style={styles.facePreview}>
                  <img src={selectedClone.faceImage} alt="Clone face" style={styles.faceImg} />
                </div>
              )}

              {/* Name Edit */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Tên Clone</h3>
                <input
                  type="text"
                  value={selectedClone.name}
                  onChange={(e) => setSelectedClone({ ...selectedClone, name: e.target.value })}
                  disabled={!editMode}
                  style={styles.textInput}
                />
              </div>

              {/* Personality */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Tính cách ({selectedClone.personality?.length || 0})</h3>
                <div style={styles.personalityList}>
                  {selectedClone.personality?.map((p, idx) => (
                    <div key={idx} style={styles.personalityItem}>
                      <strong>{p.category}:</strong>
                      <p>{p.response}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Speaking Style */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Phong cách nói chuyện</h3>
                <textarea
                  value={selectedClone.speakingStyle || ''}
                  onChange={(e) => setSelectedClone({ ...selectedClone, speakingStyle: e.target.value })}
                  disabled={!editMode}
                  style={styles.textarea}
                  placeholder="Nhập phong cách nói chuyện..."
                />
              </div>

              {/* Statistics */}
              <div style={styles.stats}>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>Được tạo:</span>
                  <span style={styles.statValue}>{selectedClone.createdAt || 'N/A'}</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>Trạng thái:</span>
                  <span style={{...styles.statValue, color: '#4ECDC4'}}>✓ Hoạt động</span>
                </div>
              </div>

              {/* Action Buttons */}
              {editMode && (
                <div style={styles.actionButtons}>
                  <button
                    onClick={() => {
                      updateClone(selectedClone.id, selectedClone);
                      setEditMode(false);
                    }}
                    style={{...styles.actionBtn, background: '#4ECDC4'}}
                  >
                    💾 Lưu thay đổi
                  </button>
                  <button
                    onClick={() => deleteClone(selectedClone.id)}
                    style={{...styles.actionBtn, background: '#FF6B6B'}}
                  >
                    🗑️ Xóa Clone
                  </button>
                </div>
              )}

              {!editMode && (
                <div style={styles.actionButtons}>
                  <button
                    onClick={() => window.location.href = `/clone/${selectedClone.id}`}
                    style={{...styles.actionBtn, background: '#FFB84D'}}
                  >
                    🎭 Vào Clone
                  </button>
                  <button
                    onClick={() => deleteClone(selectedClone.id)}
                    style={{...styles.actionBtn, background: '#FF6B6B'}}
                  >
                    🗑️ Xóa
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.emptyPanel}>
              <p style={styles.emptyIcon}>👈</p>
              <p>Chọn một clone để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>

      ) : (
        <AdminUsers />
      )}

      {/* Statistics Footer */}
      <div style={styles.footer}>
        <div style={styles.footerStat}>
          <span style={styles.footerLabel}>Tổng Clones:</span>
          <span style={styles.footerValue}>{clones.length}</span>
        </div>
        <div style={styles.footerStat}>
          <span style={styles.footerLabel}>Đã kích hoạt:</span>
          <span style={styles.footerValue}>{clones.length}</span>
        </div>
        <div style={styles.footerStat}>
          <span style={styles.footerLabel}>Thống kê:</span>
          <span style={styles.footerValue}>100%</span>
        </div>
      </div>
    </div>
  );
};

// Styles
const styles = {
  adminContainer: {
    width: '100%',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a1a 100%)',
    color: 'white',
    fontFamily: "'Segoe UI', sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '30px 40px',
    background: 'rgba(0,0,0,0.3)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: '2rem',
    margin: 0,
    background: 'linear-gradient(90deg, #ff9a56, #ff7043)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  backBtn: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '20px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s',
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    padding: '20px 40px',
    background: 'rgba(0,0,0,0.2)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  tab: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.3s',
  },
  content: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '20px',
    padding: '20px',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  searchBox: {
    display: 'flex',
    gap: '10px',
  },
  searchInput: {
    flex: 1,
    padding: '12px 15px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    color: 'white',
    outline: 'none',
  },
  controls: {
    display: 'flex',
    gap: '10px',
  },
  controlGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '12px',
    opacity: 0.7,
  },
  select: {
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: 'white',
    outline: 'none',
  },
  clonesList: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  listTitle: {
    fontSize: '14px',
    margin: '0 0 10px 0',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  cloneCard: {
    padding: '15px',
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  cloneCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  cloneName: {
    fontWeight: 'bold',
    fontSize: '15px',
  },
  cloneIcon: {
    fontSize: '18px',
  },
  cloneCardInfo: {
    fontSize: '12px',
    opacity: 0.7,
    display: 'flex',
    gap: '8px',
  },
  infoDot: {
    opacity: 0.5,
  },
  infoLabel: {
    display: 'inline-block',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.5,
    padding: '20px',
  },
  rightPanel: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '15px',
    padding: '30px',
    overflow: 'auto',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    paddingBottom: '15px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  editBtn: {
    padding: '10px 20px',
    background: '#4ECDC4',
    border: 'none',
    borderRadius: '20px',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.3s',
  },
  facePreview: {
    marginBottom: '25px',
    textAlign: 'center',
  },
  faceImg: {
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid rgba(255,112,67,0.3)',
    boxShadow: '0 10px 30px rgba(255,112,67,0.2)',
  },
  section: {
    marginBottom: '25px',
  },
  sectionTitle: {
    fontSize: '14px',
    margin: '0 0 12px 0',
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  textInput: {
    width: '100%',
    padding: '12px 15px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    height: '120px',
    padding: '12px 15px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  personalityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  personalityItem: {
    padding: '12px',
    background: 'rgba(78,205,196,0.1)',
    border: '1px solid rgba(78,205,196,0.2)',
    borderRadius: '8px',
    fontSize: '13px',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '25px',
    padding: '20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  statLabel: {
    fontSize: '12px',
    opacity: 0.7,
  },
  statValue: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#ff7043',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
  },
  actionBtn: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.3s',
  },
  emptyPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    opacity: 0.5,
  },
  emptyIcon: {
    fontSize: '50px',
    margin: 0,
  },
  footer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    padding: '20px 40px',
    background: 'rgba(0,0,0,0.3)',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  footerStat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
  },
  footerLabel: {
    opacity: 0.7,
    fontSize: '13px',
  },
  footerValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ff7043',
  },
  fullScreen: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a1a 100%)',
    color: 'white',
  },
};

export default Admin;
