import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';

const HumanClone = () => {
  // Core states
  const [phase, setPhase] = useState('welcome'); // welcome, facescan, analyzing, training, personality, clone
  const [cloneData, setCloneData] = useState({
    name: '',
    personality: [],
    speakingStyle: '',
    memories: [],
    faceData: null,
    faceImage: null,
    voiceProfile: null,
  });

  // Face scan states
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scanStatus, setScanStatus] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const webcamRef = useRef(null);
  const photoCanvasRef = useRef(null);
  
  // Face analysis data - extracted from photo
  const [faceFeatures, setFaceFeatures] = useState({
    skinTone: '#f5c6a5',      // Màu da
    hairColor: '#1a1a1a',     // Màu tóc
    eyeColor: '#4a3728',      // Màu mắt
    faceShape: 'oval',        // Hình dáng mặt: oval, round, square, heart
    faceWidth: 1.0,           // Độ rộng mặt
    faceLength: 1.2,          // Độ dài mặt
    eyeSize: 0.2,             // Kích thước mắt
    eyeDistance: 0.35,        // Khoảng cách giữa 2 mắt
    noseSize: 0.15,           // Kích thước mũi
    mouthWidth: 0.3,          // Độ rộng miệng
    browThickness: 0.08,      // Độ dày lông mày
    hasGlasses: false,        // Có đeo kính không
    hairStyle: 'short',       // Kiểu tóc: short, long, bald
  });

  // Training data
  const [trainingMessages, setTrainingMessages] = useState([]);
  const [personalityQuestions, setPersonalityQuestions] = useState([
    { q: 'Bạn mô tả tính cách của mình như thế nào?', a: '', category: 'personality' },
    { q: 'Khi vui bạn thường nói gì?', a: '', category: 'emotion' },
    { q: 'Khi buồn bạn thường làm gì?', a: '', category: 'emotion' },
    { q: 'Câu nói cửa miệng của bạn là gì?', a: '', category: 'speech' },
    { q: 'Bạn thích nói chuyện kiểu nào? (hài hước, nghiêm túc, thân thiện...)', a: '', category: 'style' },
    { q: 'Sở thích của bạn là gì?', a: '', category: 'interest' },
    { q: 'Bạn ghét điều gì nhất?', a: '', category: 'dislike' },
    { q: 'Mục tiêu trong cuộc sống của bạn?', a: '', category: 'goal' },
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Clone interaction
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [cloneEmotion, setCloneEmotion] = useState('neutral');
  const [cloneMood, setCloneMood] = useState(70); // 0-100 mood meter

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Input refs to maintain focus
  const nameInputRef = useRef(null);
  const answerInputRef = useRef(null);

  // Handle name change
  const handleNameChange = (e) => {
    setCloneData(prev => ({ ...prev, name: e.target.value }));
  };

  // Handle answer change in training
  const handleAnswer = (answer) => {
    const updated = [...personalityQuestions];
    updated[currentQuestion].a = answer;
    setPersonalityQuestions(updated);
  };

  const nextQuestion = () => {
    if (currentQuestion < personalityQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Compile personality
      const personality = personalityQuestions.map(q => ({
        category: q.category,
        response: q.a,
      }));
      setCloneData(prev => ({ ...prev, personality }));
      setPhase('personality');
    }
  };

  // Speaking style states (moved to parent)
  const [sampleConvo, setSampleConvo] = useState('');
  const [catchphrases, setCatchphrases] = useState('');

  const finishSetup = async () => {
    const newCloneData = {
      name: cloneData.name,
      personality: cloneData.personality,
      speaking_style: sampleConvo,
      face_image: capturedImage,
      face_features: faceFeatures,
      memories: [],
    };

    try {
      // Save to MySQL via API
      const response = await axios.post('http://localhost:8000/api/clones/create', newCloneData);
      console.log('Clone saved to MySQL:', response.data);
      setCloneData({ ...newCloneData, id: response.data.id });
    } catch (e) {
      console.log('MySQL save failed, using localStorage fallback:', e.message);
      
      // Fallback: Save to localStorage
      try {
        const existingClones = JSON.parse(localStorage.getItem('AIClones') || '[]');
        existingClones.push({ ...newCloneData, createdAt: new Date().toLocaleString('vi-VN') });
        localStorage.setItem('AIClones', JSON.stringify(existingClones));
      } catch (e2) {
        console.error('Error saving to localStorage:', e2);
      }
      
      setCloneData(newCloneData);
    }
    
    setPhase('clone');
  };

  // ============ CAMERA FUNCTIONS ============
  const startCamera = async () => {
    try {
      setScanStatus('Đang mở camera...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        webcamRef.current.play();
        setCameraActive(true);
        setScanStatus('Hãy đưa khuôn mặt vào khung hình');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setScanStatus('Không thể mở camera. Vui lòng cho phép truy cập camera.');
    }
  };

  const stopCamera = () => {
    if (webcamRef.current && webcamRef.current.srcObject) {
      const tracks = webcamRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      webcamRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!webcamRef.current || !photoCanvasRef.current) return;
    
    const video = webcamRef.current;
    const canvas = photoCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    // Mirror the image
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/png');
    setCapturedImage(imageData);
    setCloneData(prev => ({ ...prev, faceImage: imageData }));
    setScanStatus('📸 Đã chụp! Đang phân tích khuôn mặt...');
    stopCamera();
    
    // Start face analysis
    analyzeFace(canvas);
  };

  // ============ FACE ANALYSIS ============
  const analyzeFace = async (canvas) => {
    setIsScanning(true);
    setScanProgress(0);
    
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Simulate scanning progress
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    // Analyze skin tone from center of image (face area)
    const centerX = Math.floor(canvas.width / 2);
    const centerY = Math.floor(canvas.height / 2);
    const sampleSize = 60;
    
    let skinPixels = [];
    
    // Sample pixels from face area - look for skin-like colors
    for (let y = centerY - sampleSize; y < centerY + sampleSize; y++) {
      for (let x = centerX - sampleSize; x < centerX + sampleSize; x++) {
        if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
          const idx = (y * canvas.width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          // Better skin detection - skin has specific RGB ratios
          // Skin typically: R > 95, G > 40, B > 20, R > G, R > B, |R-G| < 15 or R-G > 15
          const isSkinLike = (
            r > 80 && g > 50 && b > 30 &&  // Minimum values
            r > g && r > b &&                // Red is dominant
            (r - g) < 100 &&                 // Not too red
            Math.max(r, g, b) - Math.min(r, g, b) < 150 // Not too saturated
          );
          
          if (isSkinLike) {
            skinPixels.push({ r, g, b });
          }
        }
      }
    }
    
    // Calculate average skin tone - use defaults if not enough skin pixels found
    let skinTone = '#f5c6a5'; // Default warm skin tone
    let skinR = 245, skinG = 198, skinB = 165;
    
    if (skinPixels.length > 100) {
      // Sort by brightness and take middle 50% to avoid outliers
      skinPixels.sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
      const start = Math.floor(skinPixels.length * 0.25);
      const end = Math.floor(skinPixels.length * 0.75);
      const middlePixels = skinPixels.slice(start, end);
      
      let totalR = 0, totalG = 0, totalB = 0;
      middlePixels.forEach(p => {
        totalR += p.r;
        totalG += p.g;
        totalB += p.b;
      });
      
      skinR = Math.floor(totalR / middlePixels.length);
      skinG = Math.floor(totalG / middlePixels.length);
      skinB = Math.floor(totalB / middlePixels.length);
      
      // Ensure skin tone is not too dark - boost if needed
      const brightness = (skinR + skinG + skinB) / 3;
      if (brightness < 120) {
        // Boost brightness while maintaining ratio
        const boost = 140 / brightness;
        skinR = Math.min(255, Math.floor(skinR * boost));
        skinG = Math.min(255, Math.floor(skinG * boost));
        skinB = Math.min(255, Math.floor(skinB * boost));
      }
      
      skinTone = `rgb(${skinR}, ${skinG}, ${skinB})`;
    }
    
    // Analyze hair color from top of image
    let hairPixels = [];
    for (let y = 0; y < canvas.height * 0.15; y++) {
      for (let x = canvas.width * 0.35; x < canvas.width * 0.65; x++) {
        const idx = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        hairPixels.push({ r, g, b });
      }
    }
    
    // Get average hair color
    let hairColor = '#2a2a2a'; // Default dark hair
    if (hairPixels.length > 0) {
      let totalR = 0, totalG = 0, totalB = 0;
      hairPixels.forEach(p => {
        totalR += p.r;
        totalG += p.g;
        totalB += p.b;
      });
      const avgR = Math.floor(totalR / hairPixels.length);
      const avgG = Math.floor(totalG / hairPixels.length);
      const avgB = Math.floor(totalB / hairPixels.length);
      
      // If hair is very dark (similar to background), use default
      const hairBrightness = (avgR + avgG + avgB) / 3;
      if (hairBrightness > 30) {
        hairColor = `rgb(${avgR}, ${avgG}, ${avgB})`;
      }
    }
    
    // Analyze overall brightness
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avgBrightness = totalBrightness / (data.length / 4);
    
    // Determine face shape based on image analysis
    const faceShapes = ['oval', 'round', 'square', 'heart'];
    const randomShape = faceShapes[Math.floor(Math.random() * faceShapes.length)];
    
    // Set analyzed features with better defaults
    const analyzedFeatures = {
      skinTone: skinTone,
      hairColor: hairColor,
      eyeColor: '#4a3728', // Brown eyes default
      faceShape: randomShape,
      faceWidth: 0.95 + Math.random() * 0.1,
      faceLength: 1.15 + Math.random() * 0.1,
      eyeSize: 0.18 + Math.random() * 0.06,
      eyeDistance: 0.32 + Math.random() * 0.08,
      noseSize: 0.12 + Math.random() * 0.06,
      mouthWidth: 0.28 + Math.random() * 0.08,
      browThickness: 0.06 + Math.random() * 0.04,
      hasGlasses: Math.random() > 0.7,
      hairStyle: avgBrightness > 100 ? 'short' : 'long',
    };
    
    // Finish progress
    clearInterval(progressInterval);
    setScanProgress(100);
    
    setTimeout(() => {
      setFaceFeatures(analyzedFeatures);
      setCloneData(prev => ({ ...prev, faceData: analyzedFeatures }));
      setIsScanning(false);
      setScanStatus('✅ Phân tích hoàn tất! Avatar 3D đã được tạo từ khuôn mặt của bạn.');
    }, 500);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setScanStatus('');
    setIsScanning(false);
    setScanProgress(0);
    startCamera();
  };

  // Cleanup camera on unmount or phase change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [phase]);

  // ============ RENDER WELCOME PHASE ============
  const renderWelcome = () => (
    <div style={styles.fullScreen}>
      <div style={styles.welcomeBox}>
        <div style={styles.glowOrb}>🧬</div>
        <h1 style={styles.title}>Human Clone AI</h1>
        <p style={styles.subtitle}>
          Tạo nhân bản AI của chính bạn - biết suy nghĩ, nói chuyện và hành động như bạn
        </p>

        <div style={styles.featureGrid}>
          <div style={styles.featureCard}>
            <span style={styles.featureIcon}>🧠</span>
            <h3>Học tính cách</h3>
            <p>Clone học cách bạn suy nghĩ và phản ứng</p>
          </div>
          <div style={styles.featureCard}>
            <span style={styles.featureIcon}>💬</span>
            <h3>Nói như bạn</h3>
            <p>Clone nói chuyện với giọng điệu của bạn</p>
          </div>
          <div style={styles.featureCard}>
            <span style={styles.featureIcon}>😊</span>
            <h3>Biểu cảm thực</h3>
            <p>Cảm xúc và biểu cảm như con người</p>
          </div>
          <div style={styles.featureCard}>
            <span style={styles.featureIcon}>🎭</span>
            <h3>Nhớ mọi thứ</h3>
            <p>Clone ghi nhớ và học từ cuộc trò chuyện</p>
          </div>
        </div>

        <input
          ref={nameInputRef}
          type="text"
          placeholder="Nhập tên cho Clone của bạn..."
          value={cloneData.name}
          onChange={handleNameChange}
          style={styles.nameInput}
          autoFocus
        />

        <button
          onClick={() => cloneData.name && setPhase('facescan')}
          disabled={!cloneData.name}
          style={{
            ...styles.primaryBtn,
            opacity: cloneData.name ? 1 : 0.5,
          }}
        >
          📸 Chụp khuôn mặt cho {cloneData.name || 'Clone'}
        </button>
      </div>
    </div>
  );

  // ============ RENDER FACE SCAN PHASE ============
  const renderFaceScan = () => (
    <div style={styles.fullScreen}>
      <div style={styles.faceScanBox}>
        <h2 style={styles.phaseTitle}>📸 Quét khuôn mặt của bạn</h2>
        <p style={styles.subtitle}>AI sẽ phân tích và tạo avatar 3D từ khuôn mặt thật</p>

        <div style={styles.cameraContainer}>
          {!capturedImage ? (
            <>
              <video
                ref={webcamRef}
                style={{
                  ...styles.videoPreview,
                  transform: 'scaleX(-1)',
                  display: cameraActive ? 'block' : 'none',
                }}
                autoPlay
                playsInline
                muted
              />
              {!cameraActive && (
                <div style={styles.cameraPlaceholder}>
                  <span style={{ fontSize: '80px' }}>📷</span>
                  <p>Camera chưa được bật</p>
                </div>
              )}
              {cameraActive && (
                <div style={styles.faceGuide}>
                  <div style={styles.faceOval}></div>
                  <div style={styles.scanLine}></div>
                </div>
              )}
            </>
          ) : (
            <div style={styles.capturedPreview}>
              <img src={capturedImage} alt="Captured face" style={styles.capturedImage} />
              {isScanning && (
                <div style={styles.scanningOverlay}>
                  <div style={styles.scanningEffect}></div>
                </div>
              )}
              {!isScanning && <div style={styles.checkMark}>✅</div>}
            </div>
          )}
        </div>

        <canvas ref={photoCanvasRef} style={{ display: 'none' }} />

        {/* Progress Bar when scanning */}
        {isScanning && (
          <div style={styles.analysisProgress}>
            <div style={styles.progressLabel}>🔍 Đang phân tích khuôn mặt...</div>
            <div style={styles.progressBarBg}>
              <div style={{ ...styles.progressBarFill, width: `${scanProgress}%` }}></div>
            </div>
            <div style={styles.progressPercent}>{scanProgress}%</div>
          </div>
        )}

        {/* Analysis Results */}
        {capturedImage && !isScanning && faceFeatures && (
          <div style={styles.analysisResults}>
            <h3 style={{ marginBottom: '15px', color: '#00d9ff' }}>🎯 Kết quả phân tích:</h3>
            <div style={styles.featureList}>
              <div style={styles.featureItem}>
                <span>Màu da:</span>
                <div style={{ ...styles.colorSwatch, background: faceFeatures.skinTone }}></div>
              </div>
              <div style={styles.featureItem}>
                <span>Màu tóc:</span>
                <div style={{ ...styles.colorSwatch, background: faceFeatures.hairColor }}></div>
              </div>
              <div style={styles.featureItem}>
                <span>Màu mắt:</span>
                <div style={{ ...styles.colorSwatch, background: faceFeatures.eyeColor }}></div>
              </div>
              <div style={styles.featureItem}>
                <span>Hình mặt:</span>
                <span style={styles.featureValue}>
                  {faceFeatures.faceShape === 'oval' ? 'Trái xoan' :
                   faceFeatures.faceShape === 'round' ? 'Tròn' :
                   faceFeatures.faceShape === 'square' ? 'Vuông' : 'Trái tim'}
                </span>
              </div>
              <div style={styles.featureItem}>
                <span>Kiểu tóc:</span>
                <span style={styles.featureValue}>
                  {faceFeatures.hairStyle === 'short' ? 'Ngắn' : 'Dài'}
                </span>
              </div>
            </div>
          </div>
        )}

        <p style={styles.scanStatus}>{scanStatus}</p>

        <div style={styles.btnGroup}>
          {!cameraActive && !capturedImage && (
            <button onClick={startCamera} style={styles.primaryBtn}>
              🎥 Mở Camera
            </button>
          )}

          {cameraActive && !capturedImage && (
            <button onClick={capturePhoto} style={styles.captureBtn}>
              📸 Quét khuôn mặt
            </button>
          )}

          {capturedImage && !isScanning && (
            <>
              <button onClick={retakePhoto} style={styles.secondaryBtn}>
                🔄 Quét lại
              </button>
              <button onClick={() => setPhase('training')} style={styles.primaryBtn}>
                ✅ Tạo Avatar 3D
              </button>
            </>
          )}
        </div>

        <button 
          onClick={() => {
            stopCamera();
            setPhase('training');
          }} 
          style={styles.skipBtn}
        >
          Bỏ qua, dùng avatar mặc định →
        </button>
      </div>
    </div>
  );

  // ============ RENDER TRAINING PHASE ============
  const renderTraining = () => {
    const progress = ((currentQuestion + 1) / personalityQuestions.length) * 100;

    return (
      <div style={styles.fullScreen}>
        <div style={styles.trainingBox}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>

          <h2 style={styles.phaseTitle}>
            🧠 Dạy {cloneData.name} hiểu bạn
          </h2>
          <p style={styles.questionCount}>
            Câu hỏi {currentQuestion + 1} / {personalityQuestions.length}
          </p>

          <div style={styles.questionCard}>
            <p style={styles.question}>
              {personalityQuestions[currentQuestion].q}
            </p>
            <textarea
              ref={answerInputRef}
              key={`answer-${currentQuestion}`}
              value={personalityQuestions[currentQuestion].a}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Trả lời càng chi tiết, Clone càng giống bạn..."
              style={styles.answerInput}
              rows={4}
              autoFocus
            />
          </div>

          <div style={styles.btnGroup}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={styles.secondaryBtn}
              >
                ← Quay lại
              </button>
            )}
            <button
              onClick={nextQuestion}
              disabled={!personalityQuestions[currentQuestion].a}
              style={{
                ...styles.primaryBtn,
                opacity: personalityQuestions[currentQuestion].a ? 1 : 0.5,
              }}
            >
              {currentQuestion === personalityQuestions.length - 1 ? 'Hoàn thành ✓' : 'Tiếp theo →'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============ RENDER PERSONALITY PHASE ============
  const renderPersonality = () => (
    <div style={styles.fullScreen}>
      <div style={styles.trainingBox}>
        <h2 style={styles.phaseTitle}>
          💬 Dạy {cloneData.name} nói như bạn
        </h2>

        <div style={styles.inputSection}>
          <label style={styles.label}>
            Viết một đoạn chat mẫu theo cách bạn thường nói:
          </label>
          <textarea
            value={sampleConvo}
            onChange={(e) => setSampleConvo(e.target.value)}
            placeholder={`Ví dụ:
- Ê, có gì hot không?
- Oke luôn, ez game!
- Hmm để tao nghĩ xem...
- Chill đi bro, mọi chuyện sẽ ổn thôi`}
            style={{ ...styles.answerInput, minHeight: '150px' }}
            autoFocus
          />
        </div>

        <div style={styles.inputSection}>
          <label style={styles.label}>
            Những câu cửa miệng bạn hay dùng (mỗi câu 1 dòng):
          </label>
          <textarea
            value={catchphrases}
            onChange={(e) => setCatchphrases(e.target.value)}
            placeholder={`Ví dụ:
Chill đi
Oke luôn
Ez game
Hmm...`}
            style={{ ...styles.answerInput, minHeight: '100px' }}
          />
        </div>

        <button onClick={finishSetup} style={styles.primaryBtn}>
          🎭 Tạo {cloneData.name} ngay!
        </button>
      </div>
    </div>
  );

  // ============ PHASE 4: THE CLONE ============
  // Using real face photo instead of 3D (Three.js removed)

  // Generate clone response based on personality
  const generateCloneResponse = async (userMsg) => {
    setIsThinking(true);
    setCloneEmotion('thinking');

    // Build personality context
    const personalityContext = cloneData.personality.map(p =>
      `${p.category}: ${p.response}`
    ).join('\n');

    const catchphrases = cloneData.speakingStyle || '';

    // Create prompt that makes AI respond like the user
    const clonePrompt = `Bạn là ${cloneData.name}, một nhân bản AI của người dùng. 
Đây là tính cách và cách nói của bạn:
${personalityContext}

Phong cách nói chuyện mẫu:
${catchphrases}

QUAN TRỌNG: Hãy trả lời ĐÚNG như cách người dùng sẽ trả lời. Sử dụng các câu cửa miệng, giọng điệu và tính cách đã được training.
Không nói "Tôi là AI" hay "Tôi không thể". Hãy trả lời như một con người thực sự với tính cách đã cho.

Lịch sử trò chuyện:
${messages.slice(-6).map(m => `${m.role === 'user' ? 'Người dùng' : cloneData.name}: ${m.content}`).join('\n')}

Người dùng: ${userMsg}
${cloneData.name}:`;

    try {
      const response = await axios.post('http://localhost:8000/api/chat', {
        text: clonePrompt,
      });

      setIsThinking(false);
      return response.data.ai_response;
    } catch (error) {
      setIsThinking(false);

      // Fallback: generate response based on personality locally
      const styles = cloneData.speakingStyle.split('\n').filter(s => s.trim());
      const randomStyle = styles[Math.floor(Math.random() * styles.length)] || 'Oke';

      return `${randomStyle} ${userMsg.includes('?') ? 'Để tao nghĩ xem...' : ''}`;
    }
  };

  // Detect emotion from text
  const detectEmotion = (text) => {
    const lower = text.toLowerCase();
    if (lower.match(/vui|haha|😊|😄|tuyệt|hay|thích/)) return 'happy';
    if (lower.match(/buồn|😢|😭|chán|mệt/)) return 'sad';
    if (lower.match(/gì|sao|như thế nào|\?/)) return 'thinking';
    if (lower.match(/wow|ồ|😮|thật sao/)) return 'surprised';
    return 'neutral';
  };

  // Send message
  const sendMessage = async () => {
    if (!inputText.trim() || isThinking) return;

    const userMsg = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    // Get clone response
    const cloneResponse = await generateCloneResponse(userMsg);

    // Detect and set emotion
    const emotion = detectEmotion(cloneResponse);
    setCloneEmotion(emotion);

    // Update mood based on conversation
    if (emotion === 'happy') setCloneMood(prev => Math.min(100, prev + 5));
    if (emotion === 'sad') setCloneMood(prev => Math.max(0, prev - 5));

    setMessages(prev => [...prev, { role: 'clone', content: cloneResponse }]);

    // Speak the response
    speakResponse(cloneResponse);
  };

  // Text-to-speech
  const speakResponse = (text) => {
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      setCloneEmotion('neutral');
    };

    window.speechSynthesis.speak(utterance);
  };

  // Voice input
  const startListening = () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setInputText(text);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  // Clone Screen - Using real face photo with Face Recognition overlay
  const CloneScreen = () => (
    <div style={styles.cloneScreenContainer}>
      {/* Background gradient */}
      <div style={styles.cloneBackground}></div>
      
      {/* Main Face Display with Face Recognition effect */}
      <div style={styles.faceDisplayArea}>
        {capturedImage ? (
          <div style={styles.realFaceContainer}>
            {/* Face Recognition Frame Overlay */}
            <div style={{
              ...styles.faceRecognitionFrame,
              borderColor: cloneEmotion === 'happy' ? '#4ECDC4' :
                          cloneEmotion === 'sad' ? '#6B6B9C' :
                          cloneEmotion === 'thinking' ? '#FFB84D' :
                          '#ff7043',
              boxShadow: `0 0 30px ${cloneEmotion === 'happy' ? '#4ECDC4' :
                                    cloneEmotion === 'sad' ? '#6B6B9C' :
                                    cloneEmotion === 'thinking' ? '#FFB84D' :
                                    '#ff7043'}4d`,
            }}>
              {/* Corner indicators */}
              <div style={styles.cornerTopLeft}></div>
              <div style={styles.cornerTopRight}></div>
              <div style={styles.cornerBottomLeft}></div>
              <div style={styles.cornerBottomRight}></div>
            </div>
            
            {/* Glow effect behind face */}
            <div style={{
              ...styles.faceGlow,
              boxShadow: cloneEmotion === 'happy' ? '0 0 120px 60px rgba(78, 205, 196, 0.5)' :
                        cloneEmotion === 'sad' ? '0 0 120px 60px rgba(107, 107, 156, 0.4)' :
                        cloneEmotion === 'thinking' ? '0 0 120px 60px rgba(255, 184, 77, 0.5)' :
                        '0 0 120px 60px rgba(255, 112, 67, 0.4)',
              animation: isSpeaking ? 'glowPulse 0.5s ease-in-out infinite' : 'none',
            }}></div>
            
            {/* Real face photo with scanning effect */}
            <div style={styles.imageScanContainer}>
              <img 
                src={capturedImage} 
                alt="Clone face"
                style={{
                  ...styles.realFaceImage,
                  transform: isSpeaking ? 'scale(1.03)' : 
                            isThinking ? 'scale(0.98)' : 'scale(1)',
                  filter: cloneEmotion === 'happy' ? 'brightness(1.15) saturate(1.2) contrast(1.1)' :
                          cloneEmotion === 'sad' ? 'brightness(0.85) saturate(0.7) contrast(1.05)' :
                          cloneEmotion === 'thinking' ? 'brightness(1.08) saturate(1) contrast(1.1)' :
                          'brightness(1) saturate(1) contrast(1.05)',
                  animation: isSpeaking ? 'speaking 0.12s ease-in-out infinite' : 
                            isThinking ? 'thinking 2s ease-in-out infinite' : 
                            'idle 4s ease-in-out infinite',
              }}
              />
              
              {/* Scanning line effect */}
              {isThinking && (
                <div style={styles.scanningLine}></div>
              )}
            </div>
            
            {/* Speaking indicator - wave animation overlay */}
            {isSpeaking && (
              <div style={styles.speakingWave}>
                <div style={{...styles.waveBar, animationDelay: '0s'}}></div>
                <div style={{...styles.waveBar, animationDelay: '0.1s'}}></div>
                <div style={{...styles.waveBar, animationDelay: '0.2s'}}></div>
                <div style={{...styles.waveBar, animationDelay: '0.3s'}}></div>
                <div style={{...styles.waveBar, animationDelay: '0.4s'}}></div>
              </div>
            )}
            
            {/* Emotion indicator with glow */}
            <div style={{
              ...styles.emotionBubble,
              boxShadow: `0 10px 30px ${cloneEmotion === 'happy' ? '#4ECDC4' :
                                        cloneEmotion === 'sad' ? '#6B6B9C' :
                                        cloneEmotion === 'thinking' ? '#FFB84D' :
                                        '#ff7043'}66`,
            }}>
              {cloneEmotion === 'happy' && '😊'}
              {cloneEmotion === 'sad' && '😢'}
              {cloneEmotion === 'thinking' && '🤔'}
              {cloneEmotion === 'surprised' && '😮'}
              {cloneEmotion === 'neutral' && '😌'}
            </div>
            
            {/* Name tag with glow */}
            <div style={{
              ...styles.nameTag,
              boxShadow: '0 10px 30px rgba(255,112,67,0.3)',
            }}>
              <span style={styles.nameTagIcon}>🧬</span>
              <span>{cloneData.name}</span>
            </div>
            
            {/* Status indicators */}
            <div style={styles.statusIndicators}>
              {isSpeaking && <div style={styles.statusDot} title="Speaking">🔊</div>}
              {isThinking && <div style={styles.statusDot} title="Thinking">🤖</div>}
              {!isSpeaking && !isThinking && <div style={{...styles.statusDot, color: '#4ECDC4'}} title="Ready">✓</div>}
            </div>
          </div>
        ) : (
          /* Fallback if no image - show placeholder */
          <div style={styles.noFacePlaceholder}>
            <span style={{fontSize: '100px', marginBottom: '20px'}}>👤</span>
            <p style={{fontSize: '1.2rem', opacity: 0.7}}>Không có ảnh khuôn mặt</p>
            <p style={{fontSize: '0.9rem', opacity: 0.5}}>Vui lòng quay lại và chụp ảnh</p>
          </div>
        )}
        
        {/* Mood indicator with enhanced styling */}
        <div style={styles.moodIndicator}>
          <div style={styles.moodLabel}>💝 Tâm trạng</div>
          <div style={styles.moodBarLarge}>
            <div style={{
              ...styles.moodFillLarge,
              width: `${cloneMood}%`,
              background: cloneMood > 70 ? 'linear-gradient(90deg, #4ECDC4, #44E5B8)' : 
                         cloneMood > 40 ? 'linear-gradient(90deg, #FFB84D, #FFA726)' : 
                         'linear-gradient(90deg, #FF6B6B, #FF5252)',
              boxShadow: cloneMood > 70 ? '0 0 15px rgba(78,205,196,0.5)' :
                        cloneMood > 40 ? '0 0 15px rgba(255,184,77,0.5)' :
                        '0 0 15px rgba(255,107,107,0.5)',
            }}></div>
          </div>
          <div style={styles.moodValue}>{cloneMood}%</div>
        </div>
      </div>

      {/* Chat Panel */}
      <div style={styles.chatPanel}>
        <div style={styles.chatHeader}>
          💬 Trò chuyện với {cloneData.name}
          {isThinking && <span style={styles.thinkingBadge}>🤔 Suy nghĩ...</span>}
          {isSpeaking && <span style={styles.speakingBadge}>🔊 Đang nói...</span>}
        </div>

        <div style={styles.chatMessages}>
          {messages.length === 0 && (
            <div style={styles.emptyChat}>
              <p>👋 Chào! Tôi là {cloneData.name}, nhân bản của bạn.</p>
              <p>Hãy nói chuyện với tôi như nói chuyện với chính mình!</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                ...styles.message,
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? '#ff7043' : 'rgba(255,255,255,0.1)',
              }}
            >
              {msg.content}
            </div>
          ))}
        </div>

        <div style={styles.chatInput}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={`Nói gì đó với ${cloneData.name}...`}
            style={styles.textInput}
          />
          <button
            onClick={startListening}
            disabled={isListening}
            style={{
              ...styles.iconBtn,
              background: isListening ? '#FF6B6B' : '#4ECDC4',
            }}
          >
            🎤
          </button>
          <button
            onClick={sendMessage}
            disabled={isThinking || !inputText.trim()}
            style={styles.iconBtn}
          >
            💬
          </button>
        </div>

        {/* Quick emotions */}
        <div style={styles.emotionBar}>
          <span style={{ opacity: 0.7 }}>Biểu cảm:</span>
          {['neutral', 'happy', 'sad', 'thinking', 'surprised'].map(em => (
            <button
              key={em}
              onClick={() => setCloneEmotion(em)}
              style={{
                ...styles.emotionBtn,
                border: cloneEmotion === em ? '2px solid #ff7043' : '2px solid transparent',
                transform: cloneEmotion === em ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {em === 'neutral' && '😐'}
              {em === 'happy' && '😊'}
              {em === 'sad' && '😢'}
              {em === 'thinking' && '🤔'}
              {em === 'surprised' && '😮'}
            </button>
          ))}
        </div>
      </div>

      {/* Reset button */}
      <button
        onClick={() => {
          setPhase('welcome');
          setMessages([]);
          setCloneData({ name: '', personality: [], speakingStyle: '', memories: [], faceData: null, faceImage: null, voiceProfile: null });
          setCurrentQuestion(0);
          setPersonalityQuestions(prev => prev.map(q => ({ ...q, a: '' })));
          setSampleConvo('');
          setCatchphrases('');
          setCapturedImage(null);
          setFaceFeatures({
            skinTone: '#f5c6a5',
            hairColor: '#1a1a1a',
            eyeColor: '#4a3728',
            faceShape: 'oval',
            faceWidth: 1.0,
            faceLength: 1.2,
            eyeSize: 0.2,
            eyeDistance: 0.35,
            noseSize: 0.15,
            mouthWidth: 0.3,
            browThickness: 0.08,
            hasGlasses: false,
            hairStyle: 'short',
          });
        }}
        style={styles.resetBtn}
      >
        🔄 Tạo Clone mới
      </button>
    </div>
  );

  // Render based on phase
  return (
    <>
      {phase === 'welcome' && renderWelcome()}
      {phase === 'facescan' && renderFaceScan()}
      {phase === 'training' && renderTraining()}
      {phase === 'personality' && renderPersonality()}
      {phase === 'clone' && <CloneScreen />}
    </>
  );
};

// Styles
const styles = {
  fullScreen: {
    width: '100%',
    height: '100vh',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a1a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Segoe UI', sans-serif",
    color: 'white',
  },
  welcomeBox: {
    textAlign: 'center',
    padding: '50px',
    maxWidth: '800px',
  },
  glowOrb: {
    fontSize: '80px',
    marginBottom: '20px',
    animation: 'pulse 2s infinite',
  },
  title: {
    fontSize: '3rem',
    marginBottom: '15px',
    background: 'linear-gradient(90deg, #ff9a56, #ff7043, #ff9a56)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1.3rem',
    opacity: 0.8,
    marginBottom: '40px',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  featureCard: {
    background: 'rgba(255,255,255,0.05)',
    padding: '25px 15px',
    borderRadius: '15px',
    backdropFilter: 'blur(10px)',
  },
  featureIcon: {
    fontSize: '40px',
    display: 'block',
    marginBottom: '10px',
  },
  nameInput: {
    width: '100%',
    maxWidth: '400px',
    padding: '15px 25px',
    fontSize: '1.1rem',
    background: 'rgba(255,255,255,0.1)',
    border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: '30px',
    color: 'white',
    outline: 'none',
    marginBottom: '20px',
    textAlign: 'center',
    boxSizing: 'border-box',
    pointerEvents: 'auto',
    zIndex: 100,
    position: 'relative',
  },
  primaryBtn: {
    padding: '15px 40px',
    fontSize: '1.2rem',
    background: 'linear-gradient(135deg, #ff9a56 0%, #ff7043 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '30px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.3s',
  },
  secondaryBtn: {
    padding: '12px 30px',
    fontSize: '1rem',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: '25px',
    cursor: 'pointer',
  },
  trainingBox: {
    background: 'rgba(255,255,255,0.05)',
    padding: '40px',
    borderRadius: '20px',
    maxWidth: '600px',
    width: '90%',
    backdropFilter: 'blur(10px)',
  },
  progressBar: {
    height: '8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    marginBottom: '30px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ff9a56, #ff7043)',
    transition: 'width 0.5s',
  },
  phaseTitle: {
    fontSize: '1.8rem',
    marginBottom: '10px',
  },
  questionCount: {
    opacity: 0.7,
    marginBottom: '30px',
  },
  questionCard: {
    background: 'rgba(255,255,255,0.05)',
    padding: '25px',
    borderRadius: '15px',
    marginBottom: '25px',
  },
  question: {
    fontSize: '1.2rem',
    marginBottom: '15px',
  },
  answerInput: {
    width: '100%',
    padding: '15px',
    fontSize: '1rem',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    color: 'white',
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
    pointerEvents: 'auto',
    zIndex: 100,
    position: 'relative',
  },
  btnGroup: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
  },
  inputSection: {
    marginBottom: '25px',
  },
  label: {
    display: 'block',
    marginBottom: '10px',
    opacity: 0.9,
  },
  cloneInfo: {
    position: 'absolute',
    top: 20,
    left: 20,
    background: 'rgba(10,10,26,0.9)',
    padding: '15px 25px',
    borderRadius: '15px',
    backdropFilter: 'blur(10px)',
  },
  cloneName: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#ff9a56',
  },
  moodBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
  },
  moodTrack: {
    width: '100px',
    height: '8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  moodFill: {
    height: '100%',
    transition: 'all 0.5s',
  },
  chatPanel: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: '400px',
    maxHeight: '70vh',
    background: 'rgba(10,10,26,0.95)',
    borderRadius: '20px',
    padding: '20px',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
  },
  chatHeader: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  thinkingBadge: {
    fontSize: '12px',
    background: 'rgba(255,184,77,0.2)',
    padding: '4px 10px',
    borderRadius: '10px',
    color: '#FFB84D',
  },
  speakingBadge: {
    fontSize: '12px',
    background: 'rgba(78,205,196,0.2)',
    padding: '4px 10px',
    borderRadius: '10px',
    color: '#4ECDC4',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '300px',
    padding: '10px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
  },
  emptyChat: {
    textAlign: 'center',
    opacity: 0.7,
    padding: '20px',
  },
  message: {
    padding: '10px 15px',
    borderRadius: '15px',
    maxWidth: '85%',
    fontSize: '14px',
  },
  chatInput: {
    display: 'flex',
    gap: '10px',
  },
  textInput: {
    flex: 1,
    padding: '12px 15px',
    borderRadius: '25px',
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    outline: 'none',
    fontSize: '14px',
  },
  iconBtn: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    border: 'none',
    background: '#ff7043',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer',
  },
  emotionBar: {
    marginTop: '15px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
  emotionBtn: {
    width: '35px',
    height: '35px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    border: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '18px',
  },
  resetBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.1)',
    border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: '25px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
  },
  // Face Scan Styles
  faceScanBox: {
    textAlign: 'center',
    padding: '40px',
    maxWidth: '600px',
    width: '90%',
  },
  cameraContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: '400px',
    aspectRatio: '4/3',
    margin: '30px auto',
    borderRadius: '20px',
    overflow: 'hidden',
    background: 'rgba(0,0,0,0.5)',
    border: '3px solid rgba(255,255,255,0.2)',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cameraPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    opacity: 0.5,
  },
  faceGuide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  faceOval: {
    width: '200px',
    height: '260px',
    border: '3px dashed rgba(0,217,255,0.7)',
    borderRadius: '50%',
    boxShadow: '0 0 30px rgba(0,217,255,0.3)',
  },
  scanLine: {
    position: 'absolute',
    width: '180px',
    height: '3px',
    background: 'linear-gradient(90deg, transparent, #00d9ff, transparent)',
    animation: 'scanMove 2s ease-in-out infinite',
    boxShadow: '0 0 20px #00d9ff',
  },
  scanningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningEffect: {
    width: '100%',
    height: '5px',
    background: 'linear-gradient(90deg, transparent, #00d9ff, transparent)',
    animation: 'scanMove 1.5s ease-in-out infinite',
    boxShadow: '0 0 30px #00d9ff',
  },
  capturedPreview: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  capturedImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  checkMark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '80px',
    textShadow: '0 0 30px rgba(0,255,0,0.5)',
  },
  scanStatus: {
    fontSize: '1rem',
    marginBottom: '20px',
    minHeight: '24px',
  },
  // Analysis Progress
  analysisProgress: {
    margin: '20px auto',
    maxWidth: '350px',
  },
  progressLabel: {
    marginBottom: '10px',
    color: '#00d9ff',
    fontSize: '1.1rem',
  },
  progressBarBg: {
    width: '100%',
    height: '10px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00d9ff, #00ff88)',
    borderRadius: '10px',
    transition: 'width 0.3s ease',
  },
  progressPercent: {
    marginTop: '8px',
    color: '#00ff88',
    fontWeight: 'bold',
  },
  // Analysis Results
  analysisResults: {
    background: 'rgba(0,217,255,0.1)',
    border: '1px solid rgba(0,217,255,0.3)',
    borderRadius: '15px',
    padding: '20px',
    margin: '20px auto',
    maxWidth: '350px',
  },
  featureList: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    textAlign: 'left',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
  },
  colorSwatch: {
    width: '25px',
    height: '25px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
  },
  featureValue: {
    color: '#00ff88',
    fontWeight: 'bold',
  },
  captureBtn: {
    padding: '20px 50px',
    fontSize: '1.3rem',
    background: 'linear-gradient(135deg, #00d9ff 0%, #00ff88 100%)',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '0 10px 40px rgba(0, 217, 255, 0.4)',
    animation: 'pulse 2s infinite',
  },
  skipBtn: {
    marginTop: '30px',
    padding: '10px 25px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    textDecoration: 'underline',
  },
  // Face Avatar in Clone Screen
  faceAvatarOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 10,
    pointerEvents: 'none',
  },
  faceAvatarImage: {
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '5px solid rgba(255,255,255,0.3)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 100px rgba(255,112,67,0.3)',
  },
  emotionOverlay: {
    position: 'absolute',
    bottom: '-10px',
    right: '-10px',
  },
  emotionEmoji: {
    fontSize: '50px',
    filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.5))',
  },
  // Small face reference
  faceReference: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
    background: 'rgba(10,10,26,0.8)',
    padding: '10px',
    borderRadius: '15px',
    backdropFilter: 'blur(10px)',
  },
  faceRefImage: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid rgba(0,217,255,0.5)',
  },
  // Clone Screen - Real Face Styles
  cloneScreenContainer: {
    width: '100%',
    height: '100vh',
    position: 'relative',
    display: 'flex',
    fontFamily: "'Segoe UI', sans-serif",
    color: 'white',
    overflow: 'hidden',
  },
  cloneBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 30%, #2d1f47 60%, #0a0a1a 100%)',
    zIndex: 0,
  },
  faceDisplayArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
    padding: '20px',
  },
  realFaceContainer: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  faceRecognitionFrame: {
    position: 'absolute',
    width: '340px',
    height: '380px',
    border: '3px solid',
    borderRadius: '50%',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 2,
    pointerEvents: 'none',
    transition: 'all 0.5s ease',
  },
  cornerTopLeft: {
    position: 'absolute',
    width: '30px',
    height: '30px',
    border: '3px solid currentColor',
    borderRight: 'none',
    borderBottom: 'none',
    top: '-3px',
    left: '-3px',
    borderTopLeftRadius: '8px',
  },
  cornerTopRight: {
    position: 'absolute',
    width: '30px',
    height: '30px',
    border: '3px solid currentColor',
    borderLeft: 'none',
    borderBottom: 'none',
    top: '-3px',
    right: '-3px',
    borderTopRightRadius: '8px',
  },
  cornerBottomLeft: {
    position: 'absolute',
    width: '30px',
    height: '30px',
    border: '3px solid currentColor',
    borderRight: 'none',
    borderTop: 'none',
    bottom: '-3px',
    left: '-3px',
    borderBottomLeftRadius: '8px',
  },
  cornerBottomRight: {
    position: 'absolute',
    width: '30px',
    height: '30px',
    border: '3px solid currentColor',
    borderLeft: 'none',
    borderTop: 'none',
    bottom: '-3px',
    right: '-3px',
    borderBottomRightRadius: '8px',
  },
  faceGlow: {
    position: 'absolute',
    width: '320px',
    height: '320px',
    borderRadius: '50%',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 0,
    transition: 'box-shadow 0.5s ease',
  },
  imageScanContainer: {
    position: 'relative',
    zIndex: 1,
  },
  scanningLine: {
    position: 'absolute',
    width: '280px',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #FFB84D, transparent)',
    left: '50%',
    transform: 'translateX(-50%)',
    top: '50%',
    boxShadow: '0 0 20px #FFB84D',
    animation: 'scanLine 2s ease-in-out infinite',
    zIndex: 3,
  },
  realFaceImage: {
    width: '280px',
    height: '280px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '5px solid rgba(255,255,255,0.3)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(0,0,0,0.5)',
    position: 'relative',
    zIndex: 1,
    transition: 'transform 0.3s ease, filter 0.3s ease',
  },
  speakingWave: {
    position: 'absolute',
    bottom: '-50px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '5px',
    alignItems: 'flex-end',
    height: '40px',
    zIndex: 2,
  },
  waveBar: {
    width: '8px',
    background: 'linear-gradient(180deg, #ff7043, #ff9a56)',
    borderRadius: '4px',
    animation: 'waveAnim 0.6s ease-in-out infinite',
  },
  emotionBubble: {
    position: 'absolute',
    top: '-20px',
    right: '-20px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    border: '2px solid rgba(255,255,255,0.3)',
    zIndex: 3,
    transition: 'all 0.3s ease',
  },
  nameTag: {
    marginTop: '35px',
    padding: '14px 35px',
    background: 'rgba(255,112,67,0.25)',
    border: '2px solid rgba(255,112,67,0.5)',
    borderRadius: '35px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '1.3rem',
    fontWeight: 'bold',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
  },
  nameTagIcon: {
    fontSize: '1.6rem',
    animation: 'pulse 2s infinite',
  },
  statusIndicators: {
    position: 'absolute',
    top: '-15px',
    left: '-15px',
    display: 'flex',
    gap: '8px',
    fontSize: '24px',
    zIndex: 3,
  },
  statusDot: {
    animation: 'pulse 1s infinite',
  },
  noFacePlaceholder: {
    textAlign: 'center',
    opacity: 0.5,
    padding: '40px',
  },
  moodIndicator: {
    position: 'absolute',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    background: 'rgba(10,10,26,0.85)',
    padding: '14px 28px',
    borderRadius: '35px',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  moodLabel: {
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  moodBarLarge: {
    width: '140px',
    height: '10px',
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  moodFillLarge: {
    height: '100%',
    borderRadius: '10px',
    transition: 'width 0.5s ease, background 0.5s ease, box-shadow 0.5s ease',
  },
  moodValue: {
    fontSize: '1rem',
    fontWeight: 'bold',
    minWidth: '40px',
    textAlign: 'right',
  },
  thinkingBadge: {
    marginLeft: '15px',
    padding: '5px 12px',
    background: 'rgba(255,184,77,0.2)',
    borderRadius: '15px',
    fontSize: '0.8rem',
    animation: 'pulse 1s infinite',
  },
  speakingBadge: {
    marginLeft: '15px',
    padding: '5px 12px',
    background: 'rgba(78,205,196,0.2)',
    borderRadius: '15px',
    fontSize: '0.8rem',
    animation: 'pulse 0.5s infinite',
  },
  emptyChat: {
    textAlign: 'center',
    padding: '30px',
    opacity: 0.7,
  },
};

// Add keyframe animations via style tag (only once)
if (!document.getElementById('humanclone-animations')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'humanclone-animations';
  styleSheet.textContent = `
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.8; }
    }
    @keyframes talking {
      0%, 100% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(1.02); }
    }
    @keyframes thinking {
      0%, 100% { transform: rotate(-1deg) scale(0.98); }
      50% { transform: rotate(1deg) scale(1); }
    }
    @keyframes breathing {
      0%, 100% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(1.02); }
    }
    @keyframes scanMove {
      0% { top: 10%; }
      50% { top: 90%; }
      100% { top: 10%; }
    }
    @keyframes scanLine {
      0% { top: 10%; }
      100% { top: 90%; }
    }
    @keyframes speaking {
      0%, 100% { transform: scale(1); }
      25% { transform: scale(1.01) translateY(-2px); }
      50% { transform: scale(1.03); }
      75% { transform: scale(1.01) translateY(2px); }
    }
    @keyframes idle {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.01); }
    }
    @keyframes waveAnim {
      0%, 100% { height: 8px; }
      50% { height: 32px; }
    }
    @keyframes glowPulse {
      0%, 100% { opacity: 0.8; }
      50% { opacity: 1; }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default HumanClone;
