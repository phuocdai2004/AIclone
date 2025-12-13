import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './AIBot.css';

const AIBot = () => {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [messages, setMessages] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  
  // Khởi tạo Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'vi-VN'; // Tiếng Việt
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (interimTranscript) {
          setTranscript(interimTranscript);
        }
        
        if (finalTranscript) {
          setTranscript(finalTranscript);
          handleUserSpeech(finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Restart if no speech detected
          if (isActive && !isSpeaking) {
            restartListening();
          }
        }
      };
      
      recognitionRef.current.onend = () => {
        // Tự động restart nếu đang active và không speaking
        if (isActive && !isSpeaking) {
          restartListening();
        }
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      synthRef.current.cancel();
    };
  }, [isActive, isSpeaking]);
  
  const restartListening = () => {
    if (recognitionRef.current && isActive && !isSpeaking) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        // Already started
      }
    }
  };
  
  // Bật/tắt AI Bot
  const toggleActive = () => {
    if (!isActive) {
      setIsActive(true);
      setMessages([{ role: 'bot', content: 'Xin chào! Tôi là AI-Bot. Hãy nói chuyện với tôi!' }]);
      speak('Xin chào! Tôi là AI Bot. Hãy nói chuyện với tôi!');
    } else {
      setIsActive(false);
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      synthRef.current.cancel();
    }
  };
  
  // Xử lý khi người dùng nói
  const handleUserSpeech = async (text) => {
    if (!text.trim() || isSpeaking) return;
    
    // Dừng lắng nghe khi xử lý
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Thêm message của user
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setTranscript('');
    
    try {
      // Gọi API để lấy response
      const res = await axios.post('http://localhost:8000/api/ai/chat', {
        message: text
      });
      
      const botResponse = res.data.response || res.data.message || 'Tôi không hiểu, bạn có thể nói lại không?';
      
      // Thêm message của bot
      setMessages(prev => [...prev, { role: 'bot', content: botResponse }]);
      setResponse(botResponse);
      
      // Phát giọng nói
      speak(botResponse);
      
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = 'Xin lỗi, có lỗi xảy ra. Hãy thử lại!';
      setMessages(prev => [...prev, { role: 'bot', content: errorMsg }]);
      speak(errorMsg);
    }
  };
  
  // Text-to-Speech
  const speak = (text) => {
    if (!synthRef.current) return;
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1;
    utterance.pitch = 1;
    
    // Chọn voice tiếng Việt nếu có
    const voices = synthRef.current.getVoices();
    const vietnameseVoice = voices.find(voice => voice.lang.includes('vi'));
    if (vietnameseVoice) {
      utterance.voice = vietnameseVoice;
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      // Bắt đầu lắng nghe lại sau khi nói xong
      if (isActive) {
        setTimeout(() => {
          restartListening();
        }, 500);
      }
    };
    
    synthRef.current.speak(utterance);
  };
  
  if (isMinimized) {
    return (
      <div className="aibot-minimized" onClick={() => setIsMinimized(false)}>
        <div className="aibot-mini-icon">🤖</div>
      </div>
    );
  }
  
  return (
    <div className="aibot-container">
      <div className="aibot-header">
        <span className="aibot-title">🤖 AI-BOT</span>
        <div className="aibot-controls">
          <button className="aibot-minimize" onClick={() => setIsMinimized(true)}>−</button>
        </div>
      </div>
      
      {/* Robot Avatar */}
      <div className={`aibot-avatar ${isActive ? 'active' : ''} ${isSpeaking ? 'speaking' : ''} ${isListening ? 'listening' : ''}`}>
        <div className="robot">
          <div className="robot-head">
            <div className="robot-face">
              <div className="robot-eyes">
                <div className="robot-eye left"></div>
                <div className="robot-eye right"></div>
              </div>
              <div className={`robot-mouth ${isSpeaking ? 'speaking' : ''}`}></div>
            </div>
          </div>
          <div className="robot-ears">
            <div className="robot-ear left"></div>
            <div className="robot-ear right"></div>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="status-indicator">
          {!isActive && <span className="status-off">💤 Chưa hoạt động</span>}
          {isActive && isListening && !isSpeaking && <span className="status-listening">🎤 Đang lắng nghe...</span>}
          {isActive && isSpeaking && <span className="status-speaking">🔊 Đang nói...</span>}
          {isActive && !isListening && !isSpeaking && <span className="status-processing">⏳ Đang xử lý...</span>}
        </div>
      </div>
      
      {/* Messages */}
      <div className="aibot-messages">
        {messages.slice(-4).map((msg, idx) => (
          <div key={idx} className={`aibot-message ${msg.role}`}>
            <span className="message-icon">{msg.role === 'user' ? '👤' : '🤖'}</span>
            <span className="message-text">{msg.content}</span>
          </div>
        ))}
        
        {/* Current transcript */}
        {transcript && isListening && (
          <div className="aibot-message user interim">
            <span className="message-icon">👤</span>
            <span className="message-text">{transcript}...</span>
          </div>
        )}
      </div>
      
      {/* Control Button */}
      <div className="aibot-footer">
        <button 
          className={`aibot-toggle ${isActive ? 'active' : ''}`}
          onClick={toggleActive}
        >
          {isActive ? '⏹️ Dừng lại' : '🎙️ Bắt đầu nói chuyện'}
        </button>
      </div>
    </div>
  );
};

export default AIBot;
