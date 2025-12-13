import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FiSend, FiTrash2, FiSettings, FiUpload, FiChevronUp, FiFile, FiMapPin, FiPlay, FiMic, FiType, FiSmile, FiThumbsUp, FiDownload, FiSearch, FiCopy, FiEdit2, FiRefreshCw } from 'react-icons/fi';
import './App.css';

const API_URL = 'http://localhost:8000';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadQuery, setUploadQuery] = useState('');
  const [userName, setUserName] = useState('You');
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredMsgIdx, setHoveredMsgIdx] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [aiProfile, setAiProfile] = useState({
    name: 'AIClone',
    avatar: '🤖',
    status: 'Online',
    color: '#0066FF'
  });
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const documentInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadHistory();
    loadAIProfile();
  }, []);

  const loadAIProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ai-profile`);
      setAiProfile(response.data);
    } catch (error) {
      console.error('Failed to load AI profile:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/history`);
      if (response.data.messages) {
        setMessages(response.data.messages);
        // Tạo lịch sử từ messages
        const history = response.data.messages.map((msg, idx) => ({
          id: idx,
          title: msg.user_message.substring(0, 30) + (msg.user_message.length > 30 ? '...' : ''),
          timestamp: new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          date: new Date(msg.timestamp).toLocaleDateString('vi-VN'),
          preview: msg.user_message
        }));
        setConversationHistory(history);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    const userMessage = input;
    setInput('');

    setMessages(prev => [...prev, {
      user_message: userMessage,
      ai_response: '',
      timestamp: new Date().toISOString(),
      isLoading: true
    }]);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        text: userMessage,
        user_name: 'User'
      });

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...response.data,
          isLoading: false
        };
        return updated;
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          ai_response: '❌ Lỗi kết nối. Vui lòng kiểm tra server.',
          isLoading: false
        };
        return updated;
      });
    }

    setLoading(false);
  };

  const clearHistory = async () => {
    if (window.confirm('Bạn chắc chắn muốn xóa lịch sử cuộc trò chuyện?')) {
      try {
        await axios.delete(`${API_URL}/api/history`);
        setMessages([]);
      } catch (error) {
        console.error('Failed to clear history:', error);
      }
    }
  };

  const uploadImage = async (file) => {
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('query', uploadQuery);

    try {
      const response = await axios.post(`${API_URL}/api/upload/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setMessages(prev => [...prev, {
        user_message: `[Image: ${file.name}]${uploadQuery ? ` - ${uploadQuery}` : ''}`,
        ai_response: response.data.ai_response,
        timestamp: response.data.timestamp
      }]);
      
      setUploadQuery('');
      if (imageInputRef.current) imageInputRef.current.value = '';
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file) => {
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('query', uploadQuery);

    try {
      const response = await axios.post(`${API_URL}/api/upload/document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setMessages(prev => [...prev, {
        user_message: `[Document: ${file.name}]${uploadQuery ? ` - ${uploadQuery}` : ''}`,
        ai_response: response.data.ai_response || response.data.message,
        timestamp: response.data.timestamp || new Date().toISOString()
      }]);
      
      setUploadQuery('');
      if (documentInputRef.current) documentInputRef.current.value = '';
    } catch (error) {
      console.error('Document upload failed:', error);
      alert('Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  // Copy message to clipboard
  const copyMessage = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(hoveredMsgIdx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Edit message
  const handleEditMessage = (idx) => {
    setEditingIdx(idx);
    setEditingText(messages[idx].user_message);
  };

  // Save edited message and resend
  const handleSaveEdit = async (idx) => {
    if (!editingText.trim()) return;
    
    setLoading(true);
    const updatedMessage = editingText;
    setEditingIdx(null);

    setMessages(prev => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        user_message: updatedMessage,
        isLoading: true
      };
      return updated;
    });

    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        text: updatedMessage,
        user_name: 'User'
      });

      setMessages(prev => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          user_message: updatedMessage,
          ai_response: response.data.ai_response,
          timestamp: response.data.timestamp,
          isLoading: false
        };
        return updated;
      });
    } catch (error) {
      console.error('Error sending edited message:', error);
      setMessages(prev => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          ai_response: '❌ Lỗi kết nối.',
          isLoading: false
        };
        return updated;
      });
    }

    setLoading(false);
  };

  // Regenerate AI response
  const regenerateResponse = async (idx) => {
    const userMessage = messages[idx].user_message;
    
    setLoading(true);
    setMessages(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], isLoading: true };
      return updated;
    });

    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        text: userMessage,
        user_name: 'User'
      });

      setMessages(prev => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          ai_response: response.data.ai_response,
          timestamp: response.data.timestamp,
          isLoading: false
        };
        return updated;
      });
    } catch (error) {
      console.error('Error regenerating response:', error);
    }

    setLoading(false);
  };

  // Export chat as JSON
  const exportChat = () => {
    const chatData = {
      exportDate: new Date().toISOString(),
      aiName: aiProfile.name,
      userName: userName,
      messages: messages
    };
    
    const dataStr = JSON.stringify(chatData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  // Start new chat
  const startNewChat = () => {
    if (messages.length > 0 && window.confirm('Bắt đầu cuộc trò chuyện mới?')) {
      setMessages([]);
      setInput('');
    }
  };

  // Search in history
  const filteredHistory = conversationHistory.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-900 flex p-0">
      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-gray-950 to-gray-900 border-r border-gray-700 flex flex-col transition-all duration-300 overflow-hidden`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          {sidebarOpen && <h2 className="text-white font-bold text-lg">📋 Lịch sử</h2>}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white transition p-1 ml-auto"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* New Conversation Button */}
        <div className="p-3">
          <button 
            onClick={startNewChat}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-2.5 px-4 font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {sidebarOpen ? <>➕ Cuộc trò chuyện mới</> : <>➕</>}
          </button>
        </div>

        {/* Search Bar */}
        {sidebarOpen && (
          <div className="px-3 pb-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-gray-500 size-4" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 text-white text-sm py-2 pl-8 pr-3 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredHistory.map((conv) => (
            <div 
              key={conv.id}
              className="group p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all cursor-pointer border border-transparent hover:border-blue-500 hover:shadow-lg"
              title={conv.preview}
            >
              {sidebarOpen && (
                <>
                  <p className="text-white text-sm font-medium truncate group-hover:text-blue-400 transition">💬 {conv.title}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-gray-500 text-xs">{conv.timestamp}</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Xóa cuộc trò chuyện này?')) {
                          clearHistory();
                        }
                      }}
                      className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {filteredHistory.length === 0 && sidebarOpen && (
            <p className="text-gray-500 text-center py-8 text-sm">Không có cuộc trò chuyện nào</p>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-700 space-y-2">
          <button 
            onClick={exportChat}
            className="w-full text-gray-400 hover:text-white hover:bg-gray-800 py-2 px-3 rounded-lg transition text-sm flex items-center justify-center gap-2"
          >
            {sidebarOpen ? <>📥 Xuất chat</> : <>📥</>}
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="w-full text-gray-400 hover:text-white hover:bg-gray-800 py-2 px-3 rounded-lg transition text-sm flex items-center justify-center gap-2"
          >
            {sidebarOpen ? <>⚙️ Cài đặt</> : <>⚙️</>}
          </button>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col bg-gray-800 h-screen">
        
        {/* HEADER - FULL WIDTH */}
        <div className="bg-gray-900 border-b border-gray-700 p-5 text-white flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-3xl font-bold overflow-hidden flex-shrink-0">
              {aiProfile.avatar.startsWith('http') ? (
                <img src={aiProfile.avatar} alt="AI" style={{width: '100%', height: '100%', objectFit: 'cover'}} onError={(e) => e.target.style.display = 'none'} />
              ) : (
                aiProfile.avatar
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{aiProfile.name}</h1>
              <p className="text-sm text-gray-400">{aiProfile.status}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-700 rounded-lg transition" title="Video call">
              📹
            </button>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition" title="Phone call">
              ☎️
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-700 rounded-lg transition" 
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* MESSAGES CONTAINER - FULL WIDTH, FLEX-GROW */}
        <div className="flex-1 overflow-y-auto p-8 space-y-5 bg-gray-800">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <p className="text-9xl mb-6">💬</p>
                <p className="text-gray-300 text-3xl font-bold mb-2">Xin chào {userName}!</p>
                <p className="text-gray-500 text-xl">Hãy bắt đầu cuộc trò chuyện với {aiProfile.name}</p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div 
                key={idx} 
                className="space-y-4"
                onMouseEnter={() => setHoveredMsgIdx(idx)}
                onMouseLeave={() => setHoveredMsgIdx(null)}
              >
                {/* User Message */}
                <div className="flex justify-end gap-3">
                  <div className="max-w-2xl group">
                    <div className="text-xs text-gray-400 text-right mb-2 px-3 font-medium">{userName}</div>
                    <div className="relative">
                      {editingIdx === idx ? (
                        <div className="bg-blue-600 text-white rounded-3xl rounded-tr-none px-6 py-3 shadow-lg">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full bg-blue-700 text-white rounded-lg p-2 text-base focus:outline-none"
                            rows="3"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleSaveEdit(idx)}
                              className="bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded text-sm"
                            >
                              Lưu
                            </button>
                            <button
                              onClick={() => setEditingIdx(null)}
                              className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-blue-600 text-white rounded-3xl rounded-tr-none px-6 py-3 shadow-lg break-words max-w-2xl">
                          <p className="text-base">{msg.user_message}</p>
                        </div>
                      )}
                      {hoveredMsgIdx === idx && editingIdx !== idx && (
                        <div className="absolute -top-10 right-0 flex gap-2 bg-gray-700 rounded-lg p-2 shadow-lg opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => copyMessage(msg.user_message)}
                            className="text-gray-300 hover:text-white transition p-1"
                            title="Copy"
                          >
                            {copiedIdx === idx ? '✓' : <FiCopy size={16} />}
                          </button>
                          <button
                            onClick={() => handleEditMessage(idx)}
                            className="text-gray-300 hover:text-white transition p-1"
                            title="Chỉnh sửa"
                          >
                            <FiEdit2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex justify-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold overflow-hidden">
                    {aiProfile.avatar.startsWith('http') ? (
                      <img src={aiProfile.avatar} alt="AI" style={{width: '100%', height: '100%', objectFit: 'cover'}} onError={(e) => e.target.style.display = 'none'} />
                    ) : (
                      aiProfile.avatar
                    )}
                  </div>
                  <div className="max-w-2xl group">
                    <div className="text-xs text-gray-400 mb-2 px-3 font-medium">{aiProfile.name} {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="relative">
                      <div className="bg-gray-700 text-gray-100 rounded-3xl rounded-tl-none px-6 py-3 shadow-lg break-words max-w-2xl">
                        {msg.isLoading ? (
                          <div className="flex gap-2 items-center">
                            <span className="text-sm">Đang suy nghĩ</span>
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                            </div>
                          </div>
                        ) : (
                          <p className="text-base whitespace-pre-wrap">{msg.ai_response}</p>
                        )}
                      </div>
                      {hoveredMsgIdx === idx && !msg.isLoading && (
                        <div className="absolute -top-10 left-0 flex gap-2 bg-gray-700 rounded-lg p-2 shadow-lg opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => copyMessage(msg.ai_response)}
                            className="text-gray-300 hover:text-white transition p-1"
                            title="Copy"
                          >
                            {copiedIdx === idx ? '✓' : <FiCopy size={16} />}
                          </button>
                          <button
                            onClick={() => regenerateResponse(idx)}
                            className="text-gray-300 hover:text-white transition p-1"
                            title="Tạo lại"
                          >
                            <FiRefreshCw size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-700 border-t border-gray-600 p-4 flex gap-2 items-center">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value || 'You')}
              placeholder="Tên của bạn..."
              className="flex-1 border border-gray-600 rounded-lg px-4 py-2 text-base bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              maxLength={20}
            />
          </div>
        )}

        {/* INPUT FORM - BOTTOM */}
        <div className="bg-gray-800 border-t border-gray-700 p-5">
          <form onSubmit={sendMessage} className="flex gap-3 items-center max-w-6xl mx-auto">
            {/* Bottom Action Buttons */}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={loading}
                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-gray-300 hover:text-white rounded-full p-3 transition text-lg"
                title="📸 Tải ảnh"
              >
                📸
              </button>
              
              <button
                type="button"
                onClick={() => documentInputRef.current?.click()}
                disabled={loading}
                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-gray-300 hover:text-white rounded-full p-3 transition text-lg"
                title="📎 Tải file"
              >
                📎
              </button>

              <button
                type="button"
                disabled={loading}
                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-gray-300 hover:text-white rounded-full p-3 transition"
                title="🎤 Voice"
              >
                <FiMic size={20} />
              </button>

              <button
                type="button"
                disabled={loading}
                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-gray-300 hover:text-white rounded-full p-3 transition"
                title="Aa Text size"
              >
                <FiType size={20} />
              </button>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => uploadImage(e.target.files?.[0])}
              style={{ display: 'none' }}
            />
            
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => uploadDocument(e.target.files?.[0])}
              style={{ display: 'none' }}
            />

            {/* Message Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 border border-gray-600 rounded-full px-6 py-3 text-base text-white bg-gray-700 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
              disabled={loading}
            />
            
            {/* Right Actions */}
            <div className="flex gap-1">
              <button
                type="button"
                disabled={loading}
                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-gray-300 hover:text-white rounded-full p-3 transition"
                title="😊 Emoji"
              >
                <FiSmile size={20} />
              </button>

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-full p-3 transition font-medium"
                title="Gửi"
              >
                <FiSend size={20} />
              </button>

              <button
                type="button"
                disabled={loading}
                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-gray-300 hover:text-white rounded-full p-3 transition"
                title="👍 Like"
              >
                <FiThumbsUp size={20} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Chat;