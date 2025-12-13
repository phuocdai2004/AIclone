import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Chat from './Chat';
import API_URL from './config';

// AI Voice Chat Component - Inline
const AIVoiceChat = () => {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState([]);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const isActiveRef = useRef(false);
  const isSpeakingRef = useRef(false);
  
  // Load voices khi component mount
  useEffect(() => {
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
        console.log('🎤 Voices loaded:', voices.length);
        // Log Vietnamese voices
        const viVoices = voices.filter(v => v.lang.startsWith('vi'));
        if (viVoices.length > 0) {
          console.log('🇻🇳 Vietnamese voices:', viVoices.map(v => v.name));
        } else {
          console.log('⚠️ No Vietnamese voices found');
        }
      }
    };
    
    loadVoices();
    
    // Chrome cần event này để load voices
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadVoices;
    }
  }, []);
  
  // Khởi tạo Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'vi-VN';
      recognitionRef.current.maxAlternatives = 1;
      
      console.log('🎤 Speech Recognition initialized');
      
      recognitionRef.current.onstart = () => {
        console.log('🎤 Listening started...');
        setIsListening(true);
      };
      
      recognitionRef.current.onresult = (event) => {
        console.log('🎤 Got result:', event.results);
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
          console.log('🎤 Interim:', interimTranscript);
          setTranscript(interimTranscript);
        }
        
        if (finalTranscript) {
          console.log('🎤 Final:', finalTranscript);
          setTranscript(finalTranscript);
          handleUserSpeech(finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.log('🎤 Speech recognition error:', event.error);
        
        switch(event.error) {
          case 'not-allowed':
            alert('⚠️ Vui lòng cho phép truy cập microphone trong trình duyệt!');
            break;
          case 'no-speech':
            // Tự động restart nếu không nghe thấy gì
            console.log('🎤 No speech detected, will restart...');
            break;
          case 'audio-capture':
            alert('⚠️ Không tìm thấy microphone! Vui lòng kiểm tra thiết bị.');
            break;
          case 'network':
            console.log('🎤 Network error, will retry...');
            break;
          case 'aborted':
            console.log('🎤 Recognition aborted (normal when stopping)');
            break;
          default:
            console.log('🎤 Unknown error:', event.error);
        }
      };
      
      recognitionRef.current.onend = () => {
        console.log('🎤 Recognition ended, isActive:', isActiveRef.current, 'isSpeaking:', isSpeakingRef.current);
        setIsListening(false);
        // Chỉ restart nếu đang active và không đang nói
        if (isActiveRef.current && !isSpeakingRef.current) {
          console.log('🎤 Will restart in 300ms...');
          setTimeout(() => restartListening(), 300);
        }
      };
    } else {
      console.error('❌ Speech Recognition not supported in this browser');
      alert('⚠️ Trình duyệt không hỗ trợ Speech Recognition! Vui lòng dùng Chrome.');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      synthRef.current.cancel();
    };
  }, []);
  
  const restartListening = () => {
    console.log('🎤 restartListening called, isActive:', isActiveRef.current, 'isSpeaking:', isSpeakingRef.current);
    if (!recognitionRef.current) {
      console.log('🎤 No recognition object!');
      return;
    }
    if (!isActiveRef.current) {
      console.log('🎤 Not active, skipping restart');
      return;
    }
    if (isSpeakingRef.current) {
      console.log('🎤 Still speaking, skipping restart');
      return;
    }
    
    try {
      recognitionRef.current.start();
      console.log('✅ Recognition started successfully!');
    } catch (e) {
      console.log('🎤 Start error:', e.message);
      // Nếu đã running thì OK
      if (e.message.includes('already started')) {
        console.log('🎤 Already running, OK');
      }
    }
  };
  
  // Request microphone permission first
  const requestMicPermission = async () => {
    try {
      console.log('🎤 Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted!');
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('❌ Microphone permission denied:', err);
      alert('⚠️ Vui lòng cho phép truy cập microphone để sử dụng tính năng này!\n\nNhấn vào biểu tượng 🔒 trên thanh địa chỉ → Cho phép Microphone');
      return false;
    }
  };
  
  const toggleActive = async () => {
    if (!isActive) {
      // Request mic permission first
      const hasPermission = await requestMicPermission();
      if (!hasPermission) return;
      
      setIsActive(true);
      isActiveRef.current = true;
      setMessages([{ role: 'bot', content: 'Xin chào! Tôi là AI-Bot. Hãy nói chuyện với tôi!' }]);
      speak('Xin chào! Tôi là AI Bot. Hãy nói chuyện với tôi!');
    } else {
      setIsActive(false);
      isActiveRef.current = false;
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      synthRef.current.cancel();
    }
  };
  
  const handleUserSpeech = async (text) => {
    if (!text.trim() || isSpeakingRef.current) return;
    
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setTranscript('');
    
    try {
      const res = await axios.post(`${API_URL}/api/ai/chat`, {
        message: text
      });
      
      const botResponse = res.data.response || res.data.message || 'Tôi không hiểu, bạn có thể nói lại không?';
      setMessages(prev => [...prev, { role: 'bot', content: botResponse }]);
      speak(botResponse);
      
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = 'Xin lỗi, có lỗi xảy ra. Hãy thử lại!';
      setMessages(prev => [...prev, { role: 'bot', content: errorMsg }]);
      speak(errorMsg);
    }
  };
  
  const speak = (text) => {
    if (!synthRef.current) return;
    
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.0;   // Tốc độ bình thường cho giọng Google
    utterance.pitch = 1.0;  // Pitch bình thường
    utterance.volume = 1;   // Âm lượng tối đa
    
    // Lấy danh sách giọng nói
    const voices = synthRef.current.getVoices();
    console.log('🔊 Available voices:', voices.map(v => `${v.name} (${v.lang})`));
    
    // Ưu tiên giọng chị Google tiếng Việt
    let bestVoice = null;
    
    // 1. Google tiếng Việt (giọng chị Google - tốt nhất!)
    bestVoice = voices.find(voice => 
      voice.name === 'Google tiếng Việt' || 
      (voice.name.toLowerCase().includes('google') && voice.lang === 'vi-VN')
    );
    
    // 2. Bất kỳ giọng Google nào có tiếng Việt
    if (!bestVoice) {
      bestVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('google') && voice.lang.startsWith('vi')
      );
    }
    
    // 3. Bất kỳ giọng vi-VN nào
    if (!bestVoice) {
      bestVoice = voices.find(voice => voice.lang === 'vi-VN');
    }
    
    // 4. Google English (nếu không có tiếng Việt)
    if (!bestVoice) {
      bestVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('google') && voice.lang.startsWith('en')
      );
    }
    
    if (bestVoice) {
      utterance.voice = bestVoice;
      // Nếu dùng giọng tiếng Anh, điều chỉnh để đọc tiếng Việt dễ nghe hơn
      if (!bestVoice.lang.startsWith('vi')) {
        utterance.rate = 0.8;  // Chậm hơn
      }
      console.log('✅ Using voice:', bestVoice.name, bestVoice.lang);
    } else {
      console.log('⚠️ No suitable voice found, using default');
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
    };
    
    utterance.onend = () => {
      console.log('🔊 Speech ended, will start listening...');
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      if (isActiveRef.current) {
        // Đợi lâu hơn để đảm bảo audio đã dừng hoàn toàn
        setTimeout(() => {
          console.log('🎤 Starting to listen after speech...');
          restartListening();
        }, 800);
      }
    };
    
    synthRef.current.speak(utterance);
  };
  
  return (
    <div style={voiceStyles.container}>
      {/* Header */}
      <div style={voiceStyles.header}>
        <h2 style={voiceStyles.headerTitle}>🤖 AI Voice Assistant</h2>
        <p style={voiceStyles.headerSubtitle}>Trò chuyện bằng giọng nói với AI</p>
      </div>
      
      {/* Robot Avatar */}
      <div style={voiceStyles.avatarSection}>
        <div style={{
          ...voiceStyles.robotContainer,
          animation: isActive ? 'float 3s ease-in-out infinite' : 'none',
        }}>
          {/* Antenna */}
          <div style={voiceStyles.antenna}>
            <div style={{
              ...voiceStyles.antennaLight,
              background: isActive ? '#00ff88' : '#ff4757',
              boxShadow: isActive ? '0 0 20px #00ff88, 0 0 40px #00ff88' : '0 0 10px #ff4757',
              animation: isActive ? 'glow 1s ease-in-out infinite alternate' : 'none',
            }}></div>
          </div>
          
          {/* Head */}
          <div style={voiceStyles.robotHead}>
            {/* Ears/Headphones */}
            <div style={{...voiceStyles.ear, left: '-15px'}}></div>
            <div style={{...voiceStyles.ear, right: '-15px'}}></div>
            
            {/* Face Screen */}
            <div style={voiceStyles.robotFace}>
              {/* Eyes */}
              <div style={voiceStyles.robotEyes}>
                <div style={{
                  ...voiceStyles.robotEye,
                  background: isActive ? '#00ff88' : '#00d4ff',
                  boxShadow: isActive ? '0 0 15px #00ff88, 0 0 30px #00ff88' : '0 0 10px #00d4ff',
                  animation: isListening ? 'eyePulse 0.5s ease-in-out infinite alternate' : 'blink 4s infinite',
                }}>
                  <div style={voiceStyles.eyeHighlight}></div>
                </div>
                <div style={{
                  ...voiceStyles.robotEye,
                  background: isActive ? '#00ff88' : '#00d4ff',
                  boxShadow: isActive ? '0 0 15px #00ff88, 0 0 30px #00ff88' : '0 0 10px #00d4ff',
                  animation: isListening ? 'eyePulse 0.5s ease-in-out infinite alternate' : 'blink 4s infinite',
                }}>
                  <div style={voiceStyles.eyeHighlight}></div>
                </div>
              </div>
              
              {/* Mouth */}
              <div style={{
                ...voiceStyles.robotMouth,
                animation: isSpeaking ? 'speak 0.15s ease-in-out infinite alternate' : 'none',
                background: isSpeaking ? '#00ff88' : '#00d4ff',
              }}></div>
              
              {/* Sound waves when speaking */}
              {isSpeaking && (
                <div style={voiceStyles.soundWaves}>
                  <div style={{...voiceStyles.wave, animationDelay: '0s'}}></div>
                  <div style={{...voiceStyles.wave, animationDelay: '0.2s'}}></div>
                  <div style={{...voiceStyles.wave, animationDelay: '0.4s'}}></div>
                </div>
              )}
            </div>
          </div>
          
          {/* Body */}
          <div style={voiceStyles.robotBody}>
            <div style={voiceStyles.robotChest}>
              <div style={{
                ...voiceStyles.chestCore,
                background: isActive ? '#00ff88' : '#00d4ff',
                boxShadow: isActive ? '0 0 20px #00ff88' : '0 0 10px #00d4ff',
              }}></div>
            </div>
          </div>
        </div>
        
        {/* Status Badge */}
        <div style={{
          ...voiceStyles.status,
          background: isActive 
            ? 'linear-gradient(90deg, rgba(0,255,136,0.2), rgba(0,212,255,0.2))' 
            : 'rgba(0, 0, 0, 0.4)',
          border: isActive ? '2px solid #00ff88' : '2px solid rgba(255,255,255,0.1)',
        }}>
          {!isActive && <span style={{ color: '#888' }}>💤 Chưa hoạt động</span>}
          {isActive && isListening && !isSpeaking && (
            <span style={{ color: '#00ff88', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={voiceStyles.listeningDot}></span>
              Đang lắng nghe...
            </span>
          )}
          {isActive && isSpeaking && <span style={{ color: '#00d4ff' }}>🔊 Đang nói...</span>}
          {isActive && !isListening && !isSpeaking && <span style={{ color: '#ffd700' }}>⏳ Đang xử lý...</span>}
        </div>
      </div>
      
      {/* Messages */}
      <div style={voiceStyles.messagesContainer}>
        <h3 style={voiceStyles.messagesTitle}>💬 Lịch sử hội thoại</h3>
        <div style={voiceStyles.messagesList}>
          {messages.length === 0 && (
            <div style={voiceStyles.emptyMessage}>
              <span>🎤</span>
              <p>Nhấn nút bên dưới để bắt đầu trò chuyện</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              ...voiceStyles.message,
              background: msg.role === 'user' 
                ? 'linear-gradient(135deg, rgba(0, 200, 255, 0.15), rgba(0, 200, 255, 0.05))' 
                : 'linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 255, 136, 0.05))',
              borderLeft: msg.role === 'user' ? '4px solid #00d4ff' : '4px solid #00ff88',
            }}>
              <div style={{
                ...voiceStyles.messageAvatar,
                background: msg.role === 'user' 
                  ? 'linear-gradient(135deg, #00d4ff, #0099cc)' 
                  : 'linear-gradient(135deg, #00ff88, #00cc6a)',
              }}>
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div style={voiceStyles.messageContent}>
                <span style={voiceStyles.messageRole}>{msg.role === 'user' ? 'Bạn' : 'AI Bot'}</span>
                <span style={voiceStyles.messageText}>{msg.content}</span>
              </div>
            </div>
          ))}
          
          {transcript && isListening && (
            <div style={{
              ...voiceStyles.message,
              background: 'rgba(0, 200, 255, 0.05)',
              borderLeft: '4px dashed #00d4ff',
              opacity: 0.7,
            }}>
              <div style={{...voiceStyles.messageAvatar, background: 'linear-gradient(135deg, #00d4ff, #0099cc)'}}>
                👤
              </div>
              <div style={voiceStyles.messageContent}>
                <span style={voiceStyles.messageRole}>Bạn</span>
                <span style={{...voiceStyles.messageText, fontStyle: 'italic'}}>{transcript}...</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Control */}
      <div style={voiceStyles.controlSection}>
        <button 
          onClick={toggleActive}
          style={{
            ...voiceStyles.toggleBtn,
            background: isActive 
              ? 'linear-gradient(135deg, #ff4757 0%, #ff6b81 100%)' 
              : 'linear-gradient(135deg, #00d4ff 0%, #00ff88 100%)',
            boxShadow: isActive 
              ? '0 8px 30px rgba(255, 71, 87, 0.4)' 
              : '0 8px 30px rgba(0, 212, 255, 0.4)',
          }}
        >
          <span style={voiceStyles.btnIcon}>{isActive ? '⏹️' : '🎙️'}</span>
          <span>{isActive ? 'Dừng lại' : 'Bắt đầu nói chuyện'}</span>
        </button>
        <p style={voiceStyles.hint}>
          {isActive 
            ? '🎤 Hãy nói, AI-Bot đang lắng nghe bạn...' 
            : '👆 Nhấn nút để bắt đầu trò chuyện bằng giọng nói'}
        </p>
      </div>
      
      {/* CSS Keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes eyePulse {
          0% { transform: scale(1); box-shadow: 0 0 15px #00ff88; }
          100% { transform: scale(1.2); box-shadow: 0 0 30px #00ff88, 0 0 50px #00ff88; }
        }
        @keyframes speak {
          0% { height: 6px; width: 35px; border-radius: 6px; }
          100% { height: 18px; width: 28px; border-radius: 50%; }
        }
        @keyframes glow {
          0% { opacity: 0.5; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes waveAnim {
          0% { transform: scaleY(0.3); opacity: 0.3; }
          50% { transform: scaleY(1); opacity: 1; }
          100% { transform: scaleY(0.3); opacity: 0.3; }
        }
        @keyframes listeningPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
};

const voiceStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
    padding: '30px',
    background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)',
    borderRadius: '24px',
    border: '2px solid rgba(0, 200, 255, 0.2)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 200, 255, 0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  header: {
    textAlign: 'center',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  headerTitle: {
    margin: '0 0 5px 0',
    fontSize: '24px',
    background: 'linear-gradient(90deg, #00d4ff, #00ff88)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    margin: 0,
    color: 'rgba(255,255,255,0.5)',
    fontSize: '13px',
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '20px',
  },
  robotContainer: {
    width: '160px',
    height: '220px',
    position: 'relative',
  },
  antenna: {
    position: 'absolute',
    top: '-25px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '4px',
    height: '25px',
    background: 'linear-gradient(180deg, #3a7bd5, #2b5fb3)',
    borderRadius: '2px',
  },
  antennaLight: {
    position: 'absolute',
    top: '-8px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  robotHead: {
    width: '130px',
    height: '110px',
    background: 'linear-gradient(180deg, #4a8fe7 0%, #3a7bd5 50%, #2b5fb3 100%)',
    borderRadius: '25px 25px 20px 20px',
    position: 'absolute',
    top: '0',
    left: '15px',
    boxShadow: '0 15px 40px rgba(58, 123, 213, 0.5), inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -5px 15px rgba(0, 0, 0, 0.3)',
  },
  ear: {
    position: 'absolute',
    top: '30px',
    width: '20px',
    height: '40px',
    background: 'linear-gradient(180deg, #3a7bd5, #2b5fb3)',
    borderRadius: '10px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
  },
  robotFace: {
    position: 'absolute',
    top: '20px',
    left: '15px',
    width: '100px',
    height: '65px',
    background: 'linear-gradient(180deg, #0d1117 0%, #161b22 100%)',
    borderRadius: '15px',
    border: '3px solid #00d4ff',
    boxShadow: 'inset 0 0 30px rgba(0, 212, 255, 0.2), 0 0 15px rgba(0, 212, 255, 0.3)',
    overflow: 'hidden',
  },
  robotEyes: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    paddingTop: '15px',
  },
  robotEye: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    position: 'relative',
  },
  eyeHighlight: {
    position: 'absolute',
    top: '3px',
    left: '3px',
    width: '6px',
    height: '6px',
    background: 'rgba(255,255,255,0.8)',
    borderRadius: '50%',
  },
  robotMouth: {
    width: '35px',
    height: '6px',
    margin: '12px auto 0',
    borderRadius: '6px',
  },
  soundWaves: {
    position: 'absolute',
    bottom: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '4px',
    alignItems: 'flex-end',
    height: '15px',
  },
  wave: {
    width: '4px',
    height: '100%',
    background: '#00ff88',
    borderRadius: '2px',
    animation: 'waveAnim 0.5s ease-in-out infinite',
  },
  robotBody: {
    width: '100px',
    height: '80px',
    background: 'linear-gradient(180deg, #3a7bd5 0%, #2b5fb3 100%)',
    borderRadius: '20px 20px 25px 25px',
    position: 'absolute',
    bottom: '10px',
    left: '30px',
    boxShadow: '0 10px 30px rgba(58, 123, 213, 0.4), inset 0 2px 0 rgba(255,255,255,0.1)',
  },
  robotChest: {
    width: '60px',
    height: '40px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '12px',
    margin: '15px auto',
    border: '2px solid rgba(0, 212, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chestCore: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
  },
  status: {
    fontSize: '15px',
    padding: '12px 25px',
    borderRadius: '30px',
    fontWeight: 'bold',
    transition: 'all 0.3s',
  },
  listeningDot: {
    width: '10px',
    height: '10px',
    background: '#00ff88',
    borderRadius: '50%',
    animation: 'listeningPulse 1s ease-in-out infinite',
  },
  messagesContainer: {
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '16px',
    padding: '20px',
    maxHeight: '280px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  messagesTitle: {
    margin: '0 0 15px 0',
    color: '#00d4ff',
    fontSize: '15px',
    fontWeight: '600',
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '220px',
    overflowY: 'auto',
    paddingRight: '5px',
  },
  emptyMessage: {
    textAlign: 'center',
    padding: '30px',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '14px',
  },
  message: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '12px',
    transition: 'all 0.2s',
  },
  messageAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
  },
  messageContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  messageRole: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  messageText: {
    color: '#e0e0e0',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  controlSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    paddingTop: '10px',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '16px 40px',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: '#fff',
    transition: 'all 0.3s',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  btnIcon: {
    fontSize: '20px',
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '13px',
    margin: 0,
  },
};

const UserHome = ({ user, role, onLogout }) => {
  const [tab, setTab] = useState('clones'); // chat, clones, create
  const [clones, setClones] = useState([]);
  const [selectedClone, setSelectedClone] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [personalClones, setPersonalClones] = useState([]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadClones();
  }, []);

  const loadClones = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/clones/`);
      setClones(response.data);
      // Filter personal clones created by this user
      const personal = response.data.filter(c => c.created_by === user.username);
      setPersonalClones(personal);
    } catch (error) {
      console.error('Error loading clones:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedClone) return;

    const newMessage = { role: 'user', content: chatInput };
    setChatMessages([...chatMessages, newMessage]);
    setChatInput('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/clones/${selectedClone.id}/memory`,
        {
          message: chatInput,
          conversation_type: 'chat'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error getting response' }]);
    } finally {
      setLoading(false);
    }
  };

  const selectClone = (clone) => {
    setSelectedClone(clone);
    setChatMessages([]);
    setTab('chat');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🧬 AIClone</h1>
          <p style={styles.subtitle}>Welcome, {user.username}!</p>
        </div>
        <button onClick={onLogout} style={styles.logoutBtn}>
          🚪 Logout
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setTab('clones')}
          style={{
            ...styles.tab,
            background: tab === 'clones' ? '#4ECDC4' : 'rgba(255,255,255,0.1)',
          }}
        >
          📚 All Clones
        </button>
        {selectedClone && (
          <button
            onClick={() => setTab('chat')}
            style={{
              ...styles.tab,
              background: tab === 'chat' ? '#27AE60' : 'rgba(255,255,255,0.1)',
            }}
          >
            💬 Chat with {selectedClone.name}
          </button>
        )}
        <button
          onClick={() => setTab('gemini')}
          style={{
            ...styles.tab,
            background: tab === 'gemini' ? '#FF9800' : 'rgba(255,255,255,0.1)',
          }}
        >
          🤖 Chat with Gemini
        </button>
        <button
          onClick={() => setTab('aibot')}
          style={{
            ...styles.tab,
            background: tab === 'aibot' ? '#00d4ff' : 'rgba(255,255,255,0.1)',
          }}
        >
          🎙️ AI Voice Chat
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Show message when no clone selected and trying to view chat */}
        {tab === 'chat' && !selectedClone && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>💬 Chat</h2>
            <div style={styles.emptyState}>
              <p>Please select a clone to start chatting</p>
              <button
                onClick={() => setTab('clones')}
                style={styles.createBtn}
              >
                Browse Available Clones →
              </button>
            </div>
          </div>
        )}

        {/* All Clones Tab */}
        {tab === 'clones' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>All Available Clones</h2>
            <div style={styles.cloneGrid}>
              {clones.length === 0 ? (
                <p>No clones available yet</p>
              ) : (
                clones.map(clone => (
                  <div
                    key={clone.id}
                    onClick={() => selectClone(clone)}
                    style={{
                      ...styles.cloneCard,
                      cursor: 'pointer',
                      transform: 'scale(1)',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {clone.face_image && (
                      <img
                        src={`data:image/png;base64,${clone.face_image}`}
                        style={styles.cloneImage}
                        alt={clone.name}
                      />
                    )}
                    <div style={styles.cloneInfo}>
                      <h3>{clone.name || 'Unnamed Clone'}</h3>
                      <p style={styles.cloneStyle}>{clone.speaking_style || 'Default'}</p>
                      <button style={styles.chatBtn}>Start Chat →</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {tab === 'chat' && selectedClone && (
          <div style={styles.chatSection}>
            <h2 style={styles.sectionTitle}>Chatting with {selectedClone.name}</h2>
            <div style={styles.chatContainer}>
              <div style={styles.messagesBox}>
                {chatMessages.length === 0 && (
                  <div style={styles.emptyChat}>
                    <p>👋 Start a conversation</p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.message,
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      background: msg.role === 'user' ? '#4ECDC4' : '#9B59B6',
                    }}
                  >
                    {msg.content}
                  </div>
                ))}
                {loading && <div style={styles.loading}>⏳ Thinking...</div>}
              </div>

              <div style={styles.inputBox}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  style={styles.chatInput}
                  disabled={loading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={loading}
                  style={{...styles.sendBtn, opacity: loading ? 0.5 : 1}}
                >
                  📤 Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gemini Chat Tab */}
        {tab === 'gemini' && (
          <div style={styles.section}>
            <Chat />
          </div>
        )}

        {/* AI Voice Chat Tab */}
        {tab === 'aibot' && (
          <AIVoiceChat />
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a1a 100%)',
    color: 'white',
    fontFamily: "'Segoe UI', sans-serif",
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
    margin: '0 0 5px 0',
    background: 'linear-gradient(90deg, #4ECDC4, #44A08D)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    margin: 0,
    color: 'rgba(255,255,255,0.7)',
    fontSize: '14px',
  },
  logoutBtn: {
    padding: '10px 20px',
    background: '#E74C3C',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    padding: '20px 40px',
    background: 'rgba(0,0,0,0.2)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    overflowX: 'auto',
  },
  tab: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    transition: 'all 0.3s',
  },
  content: {
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '1.8rem',
    marginBottom: '20px',
    color: 'white',
  },
  cloneGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
  },
  cloneCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'all 0.3s',
  },
  cloneImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
  },
  cloneInfo: {
    padding: '15px',
  },
  cloneStyle: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
    margin: '5px 0',
  },
  chatBtn: {
    width: '100%',
    padding: '8px',
    background: '#4ECDC4',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginTop: '10px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
  },
  createBtn: {
    padding: '12px 30px',
    background: 'linear-gradient(135deg, #ff7043, #ff5722)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    marginTop: '20px',
  },
  createForm: {
    background: 'rgba(255,255,255,0.05)',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center',
  },
  chatSection: {
    marginBottom: '40px',
  },
  chatContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '600px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  messagesBox: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    maxWidth: '60%',
    wordWrap: 'break-word',
  },
  emptyChat: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '18px',
  },
  loading: {
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
  },
  inputBox: {
    display: 'flex',
    gap: '10px',
    padding: '15px 20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  chatInput: {
    flex: 1,
    padding: '12px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
  },
  sendBtn: {
    padding: '12px 20px',
    background: '#4ECDC4',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};

export default UserHome;
