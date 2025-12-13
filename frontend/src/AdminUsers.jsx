import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/users/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (e) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        // Update user
        await axios.put(`http://localhost:8000/api/users/${editingId}`, form, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setSuccess('User updated successfully');
      } else {
        // Create new user
        await axios.post('http://localhost:8000/api/users/register', form, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setSuccess('User created successfully');
      }
      
      setForm({ username: '', email: '', password: '', role: 'user' });
      setEditingId(null);
      setShowForm(false);
      loadUsers();
    } catch (e) {
      setError(e.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (user) => {
    setForm({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user?')) return;

    try {
      await axios.delete(`http://localhost:8000/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccess('User deleted successfully');
      loadUsers();
    } catch (e) {
      setError('Failed to delete user');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await axios.put(`http://localhost:8000/api/users/${userId}/role?role=${newRole}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccess('Role updated successfully');
      loadUsers();
    } catch (e) {
      setError('Failed to update role');
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>👥 User Management</h2>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <button
        onClick={() => {
          setShowForm(!showForm);
          setEditingId(null);
          setForm({ username: '', email: '', password: '', role: 'user' });
        }}
        style={{...styles.button, marginBottom: '20px'}}
      >
        {showForm ? '✕ Cancel' : '+ Create User'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({...form, username: e.target.value})}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password {editingId && '(leave blank to keep current)'}</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
              style={styles.input}
              required={!editingId}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({...form, role: e.target.value})}
              style={styles.input}
            >
              <option value="user">👤 User</option>
            </select>
          </div>

          <button type="submit" style={styles.submitButton}>
            {editingId ? 'Update User' : 'Create User'}
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div style={styles.usersList}>
          {users.length === 0 ? (
            <p>No users found</p>
          ) : (
            users.map(user => (
              <div key={user.id} style={styles.userCard}>
                <div style={styles.userInfo}>
                  <div style={styles.userName}>
                    {user.role === 'admin' ? '👑' : '👤'} {user.username}
                  </div>
                  <div style={styles.userEmail}>{user.email}</div>
                  <div style={styles.userRole}>
                    Role: <strong>{user.role}</strong>
                  </div>
                </div>

                <div style={styles.userActions}>
                  <button
                    onClick={() => handleEdit(user)}
                    style={{...styles.actionButton, background: '#9B59B6'}}
                  >
                    ✎ Edit
                  </button>

                  <button
                    onClick={() => handleDelete(user.id)}
                    style={{...styles.actionButton, background: '#E74C3C'}}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    color: '#fff',
  },
  title: {
    fontSize: '1.8rem',
    marginBottom: '20px',
    color: 'white',
  },
  button: {
    padding: '10px 20px',
    background: '#4ECDC4',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  error: {
    padding: '12px',
    background: '#E74C3C',
    color: 'white',
    borderRadius: '8px',
    marginBottom: '15px',
  },
  success: {
    padding: '12px',
    background: '#27AE60',
    color: 'white',
    borderRadius: '8px',
    marginBottom: '15px',
  },
  form: {
    background: 'rgba(255,255,255,0.05)',
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontSize: '14px',
    fontWeight: '600',
  },
  input: {
    width: '100%',
    padding: '10px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  submitButton: {
    width: '100%',
    padding: '10px',
    background: 'linear-gradient(135deg, #4ECDC4, #44A08D)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  usersList: {
    display: 'grid',
    gap: '15px',
  },
  userCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  userEmail: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '5px',
  },
  userRole: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
  },
  userActions: {
    display: 'flex',
    gap: '10px',
  },
  actionButton: {
    padding: '8px 12px',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
};

export default AdminUsers;
