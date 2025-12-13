import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import axios from 'axios';

const Avatar3D = () => {
  const mountRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const headRef = useRef(null);
  const mouthRef = useRef(null);
  const leftEyeRef = useRef(null);
  const rightEyeRef = useRef(null);
  const leftBrowRef = useRef(null);
  const rightBrowRef = useRef(null);
  const faceTextureRef = useRef(null);

  const [mode, setMode] = useState('setup'); // setup, scanning, avatar
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [faceData, setFaceData] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [expression, setExpression] = useState('neutral'); // neutral, happy, sad, angry, surprised
  const [chatHistory, setChatHistory] = useState([]);

  const [avatarConfig, setAvatarConfig] = useState({
    skinColor: '#F5C6A5',
    eyeColor: '#4A3728',
    hairColor: '#2C1810',
    lipColor: '#C4756E',
    faceTexture: null,
    faceShape: 'oval', // oval, round, square, heart
    eyeSize: 1,
    noseSize: 1,
    mouthSize: 1,
  });

  // Start webcam for face scanning
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setMode('scanning');
    } catch (error) {
      console.error('Webcam error:', error);
      alert('❌ Không thể truy cập camera. Vui lòng cho phép quyền truy cập.');
    }
  };

  // Capture face from webcam
  const captureFace = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Flip horizontally for mirror effect
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.9);
  }, []);

  // Analyze face colors and features
  const analyzeFace = useCallback((imageData) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Sample skin color from forehead area
        const foreheadData = ctx.getImageData(
          img.width * 0.4, img.height * 0.15,
          img.width * 0.2, img.height * 0.1
        );

        // Sample eye color
        const leftEyeData = ctx.getImageData(
          img.width * 0.3, img.height * 0.35,
          img.width * 0.1, img.height * 0.05
        );

        // Sample hair color from top
        const hairData = ctx.getImageData(
          img.width * 0.3, img.height * 0.02,
          img.width * 0.4, img.height * 0.08
        );

        // Sample lip color
        const lipData = ctx.getImageData(
          img.width * 0.4, img.height * 0.65,
          img.width * 0.2, img.height * 0.08
        );

        const getAvgColor = (data) => {
          let r = 0, g = 0, b = 0;
          for (let i = 0; i < data.data.length; i += 4) {
            r += data.data[i];
            g += data.data[i + 1];
            b += data.data[i + 2];
          }
          const count = data.data.length / 4;
          return `rgb(${Math.round(r/count)},${Math.round(g/count)},${Math.round(b/count)})`;
        };

        resolve({
          skinColor: getAvgColor(foreheadData),
          eyeColor: getAvgColor(leftEyeData),
          hairColor: getAvgColor(hairData),
          lipColor: getAvgColor(lipData),
          faceTexture: imageData,
        });
      };
      img.src = imageData;
    });
  }, []);

  // Scan face with progress
  const scanFace = async () => {
    setScanProgress(0);
    const captures = [];

    // Capture multiple frames for better analysis
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 500));
      const capture = captureFace();
      if (capture) captures.push(capture);
      setScanProgress((i + 1) * 20);
    }

    if (captures.length > 0) {
      // Use the best capture (middle one)
      const bestCapture = captures[Math.floor(captures.length / 2)];
      const analysis = await analyzeFace(bestCapture);

      setFaceData(analysis);
      setAvatarConfig(prev => ({
        ...prev,
        ...analysis,
      }));

      // Stop webcam
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }

      setScanProgress(100);
      setTimeout(() => setMode('avatar'), 1000);
    }
  };

  // Initialize 3D Avatar
  useEffect(() => {
    if (mode !== 'avatar' || !mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 4;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(2, 3, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-2, 1, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff9a56, 0.3);
    rimLight.position.set(0, 2, -3);
    scene.add(rimLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    // Create realistic head
    const headGroup = new THREE.Group();
    scene.add(headGroup);
    headRef.current = headGroup;

    // Head base (ellipsoid)
    const headGeo = new THREE.SphereGeometry(1, 64, 64);
    const headMat = new THREE.MeshStandardMaterial({
      color: avatarConfig.skinColor,
      roughness: 0.4,
      metalness: 0.05,
    });

    // Apply face texture if available
    if (avatarConfig.faceTexture) {
      const textureLoader = new THREE.TextureLoader();
      const faceTexture = textureLoader.load(avatarConfig.faceTexture);
      headMat.map = faceTexture;
      faceTextureRef.current = faceTexture;
    }

    const head = new THREE.Mesh(headGeo, headMat);
    head.scale.set(1, 1.15, 0.95);
    head.castShadow = true;
    headGroup.add(head);

    // Hair
    const hairGeo = new THREE.SphereGeometry(1.12, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hairMat = new THREE.MeshStandardMaterial({
      color: avatarConfig.hairColor,
      roughness: 0.7,
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.35;
    hair.scale.set(1, 1.1, 0.95);
    headGroup.add(hair);

    // Eyes with realistic structure
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();

      // Eye socket (slight indent)
      const socketGeo = new THREE.SphereGeometry(0.22, 32, 32);
      const socketMat = new THREE.MeshStandardMaterial({
        color: '#E8D4C4',
        roughness: 0.5,
      });
      const socket = new THREE.Mesh(socketGeo, socketMat);
      socket.position.z = -0.02;
      eyeGroup.add(socket);

      // Eyeball (white)
      const eyeballGeo = new THREE.SphereGeometry(0.18, 32, 32);
      const eyeballMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
      });
      const eyeball = new THREE.Mesh(eyeballGeo, eyeballMat);
      eyeGroup.add(eyeball);

      // Iris
      const irisGeo = new THREE.CircleGeometry(0.1, 32);
      const irisMat = new THREE.MeshStandardMaterial({
        color: avatarConfig.eyeColor,
        roughness: 0.3,
      });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.z = 0.16;
      eyeGroup.add(iris);

      // Pupil
      const pupilGeo = new THREE.CircleGeometry(0.04, 32);
      const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.17;
      eyeGroup.add(pupil);

      // Eye highlight
      const highlightGeo = new THREE.CircleGeometry(0.02, 16);
      const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.set(0.03, 0.03, 0.18);
      eyeGroup.add(highlight);

      eyeGroup.position.set(x, 0.25, 0.85);
      eyeGroup.scale.setScalar(avatarConfig.eyeSize);
      return eyeGroup;
    };

    const leftEye = createEye(-0.32);
    const rightEye = createEye(0.32);
    headGroup.add(leftEye);
    headGroup.add(rightEye);
    leftEyeRef.current = leftEye;
    rightEyeRef.current = rightEye;

    // Eyebrows
    const browGeo = new THREE.BoxGeometry(0.28, 0.06, 0.08);
    const browMat = new THREE.MeshStandardMaterial({
      color: avatarConfig.hairColor,
      roughness: 0.6,
    });

    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.position.set(-0.32, 0.48, 0.82);
    leftBrow.rotation.z = 0.15;
    headGroup.add(leftBrow);
    leftBrowRef.current = leftBrow;

    const rightBrow = new THREE.Mesh(browGeo, browMat);
    rightBrow.position.set(0.32, 0.48, 0.82);
    rightBrow.rotation.z = -0.15;
    headGroup.add(rightBrow);
    rightBrowRef.current = rightBrow;

    // Nose
    const noseGroup = new THREE.Group();
    const noseBridgeGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.35, 16);
    const noseMat = new THREE.MeshStandardMaterial({
      color: avatarConfig.skinColor,
      roughness: 0.4,
    });
    const noseBridge = new THREE.Mesh(noseBridgeGeo, noseMat);
    noseBridge.rotation.x = Math.PI * 0.15;
    noseGroup.add(noseBridge);

    const noseTipGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const noseTip = new THREE.Mesh(noseTipGeo, noseMat);
    noseTip.position.set(0, -0.12, 0.08);
    noseGroup.add(noseTip);

    noseGroup.position.set(0, 0.05, 0.9);
    noseGroup.scale.setScalar(avatarConfig.noseSize);
    headGroup.add(noseGroup);

    // Mouth with lips
    const mouthGroup = new THREE.Group();

    // Upper lip
    const upperLipGeo = new THREE.TorusGeometry(0.18, 0.04, 8, 32, Math.PI);
    const lipMat = new THREE.MeshStandardMaterial({
      color: avatarConfig.lipColor,
      roughness: 0.5,
    });
    const upperLip = new THREE.Mesh(upperLipGeo, lipMat);
    upperLip.rotation.x = Math.PI;
    upperLip.position.y = 0.02;
    mouthGroup.add(upperLip);

    // Lower lip
    const lowerLipGeo = new THREE.TorusGeometry(0.16, 0.05, 8, 32, Math.PI);
    const lowerLip = new THREE.Mesh(lowerLipGeo, lipMat);
    lowerLip.position.y = -0.02;
    mouthGroup.add(lowerLip);

    // Mouth interior (for opening)
    const mouthInteriorGeo = new THREE.PlaneGeometry(0.3, 0.15);
    const mouthInteriorMat = new THREE.MeshStandardMaterial({
      color: 0x3d1f1f,
      side: THREE.DoubleSide,
    });
    const mouthInterior = new THREE.Mesh(mouthInteriorGeo, mouthInteriorMat);
    mouthInterior.position.z = -0.02;
    mouthInterior.visible = false;
    mouthGroup.add(mouthInterior);

    mouthGroup.position.set(0, -0.38, 0.88);
    mouthGroup.scale.setScalar(avatarConfig.mouthSize);
    headGroup.add(mouthGroup);
    mouthRef.current = mouthGroup;

    // Ears
    const earGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const earMat = new THREE.MeshStandardMaterial({
      color: avatarConfig.skinColor,
      roughness: 0.5,
    });

    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.98, 0.15, 0);
    leftEar.scale.set(0.5, 1, 0.6);
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, earMat);
    rightEar.position.set(0.98, 0.15, 0);
    rightEar.scale.set(0.5, 1, 0.6);
    headGroup.add(rightEar);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.5, 32);
    const neckMat = new THREE.MeshStandardMaterial({
      color: avatarConfig.skinColor,
      roughness: 0.4,
    });
    const neck = new THREE.Mesh(neckGeo, neckMat);
    neck.position.y = -1.35;
    headGroup.add(neck);

    // Animation variables
    let blinkTimer = 0;
    let breathTimer = 0;
    let talkTimer = 0;
    let currentExpression = 'neutral';

    // Mouse tracking
    const onMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (headRef.current) {
        // Smooth head rotation
        headRef.current.rotation.y += (x * 0.4 - headRef.current.rotation.y) * 0.1;
        headRef.current.rotation.x += (y * 0.2 - headRef.current.rotation.x) * 0.1;
      }

      // Eye follow
      if (leftEyeRef.current && rightEyeRef.current) {
        leftEyeRef.current.rotation.y = x * 0.3;
        leftEyeRef.current.rotation.x = -y * 0.2;
        rightEyeRef.current.rotation.y = x * 0.3;
        rightEyeRef.current.rotation.x = -y * 0.2;
      }
    };

    window.addEventListener('mousemove', onMouseMove);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Breathing animation
      breathTimer += 0.02;
      if (headRef.current) {
        headRef.current.position.y = Math.sin(breathTimer) * 0.02;
        headRef.current.scale.x = 1 + Math.sin(breathTimer) * 0.005;
      }

      // Blinking
      blinkTimer++;
      if (blinkTimer > 180 && blinkTimer < 190) {
        const blinkAmount = 1 - Math.sin((blinkTimer - 180) / 10 * Math.PI);
        if (leftEyeRef.current) leftEyeRef.current.scale.y = Math.max(0.1, blinkAmount);
        if (rightEyeRef.current) rightEyeRef.current.scale.y = Math.max(0.1, blinkAmount);
      } else {
        if (leftEyeRef.current) leftEyeRef.current.scale.y = 1;
        if (rightEyeRef.current) rightEyeRef.current.scale.y = 1;
        if (blinkTimer > 190) blinkTimer = 0;
      }

      // Talking animation (mouth movement)
      if (isSpeaking && mouthRef.current) {
        talkTimer += 0.3;
        const mouthOpen = Math.abs(Math.sin(talkTimer)) * 0.3;
        mouthRef.current.scale.y = 1 + mouthOpen;
        mouthRef.current.children[2].visible = mouthOpen > 0.1; // Show interior when open
      } else {
        if (mouthRef.current) {
          mouthRef.current.scale.y = 1;
          mouthRef.current.children[2].visible = false;
        }
      }

      // Expression animations
      if (leftBrowRef.current && rightBrowRef.current) {
        switch (expression) {
          case 'happy':
            leftBrowRef.current.position.y = 0.52;
            rightBrowRef.current.position.y = 0.52;
            if (mouthRef.current) mouthRef.current.rotation.z = 0.1;
            break;
          case 'sad':
            leftBrowRef.current.rotation.z = -0.3;
            rightBrowRef.current.rotation.z = 0.3;
            if (mouthRef.current) mouthRef.current.rotation.z = -0.1;
            break;
          case 'angry':
            leftBrowRef.current.rotation.z = 0.4;
            rightBrowRef.current.rotation.z = -0.4;
            leftBrowRef.current.position.y = 0.42;
            rightBrowRef.current.position.y = 0.42;
            break;
          case 'surprised':
            leftBrowRef.current.position.y = 0.55;
            rightBrowRef.current.position.y = 0.55;
            if (mouthRef.current) mouthRef.current.scale.y = 1.5;
            break;
          default:
            leftBrowRef.current.position.y = 0.48;
            rightBrowRef.current.position.y = 0.48;
            leftBrowRef.current.rotation.z = 0.15;
            rightBrowRef.current.rotation.z = -0.15;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [mode, avatarConfig, isSpeaking, expression]);

  // Voice recognition
  const startListening = () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript);
      setIsListening(false);
      sendMessage(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  // Send message to AI
  const sendMessage = async (msg) => {
    if (!msg.trim()) return;

    setChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    setIsSpeaking(true);

    // Detect emotion from message
    if (msg.includes('vui') || msg.includes('haha') || msg.includes('😊')) {
      setExpression('happy');
    } else if (msg.includes('buồn') || msg.includes('😢')) {
      setExpression('sad');
    } else if (msg.includes('tức') || msg.includes('😠')) {
      setExpression('angry');
    } else {
      setExpression('neutral');
    }

    try {
      const response = await axios.post('http://localhost:8000/api/chat', { text: msg });
      const aiResponse = response.data.ai_response;

      setChatHistory(prev => [...prev, { role: 'ai', content: aiResponse }]);
      setMessage(aiResponse);

      // Text-to-speech with emotion
      const utterance = new SpeechSynthesisUtterance(aiResponse);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        setIsSpeaking(false);
        setExpression('neutral');
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error:', error);
      setIsSpeaking(false);
      setExpression('neutral');
    }
  };

  // Render based on mode
  if (mode === 'setup') {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: "'Segoe UI', sans-serif",
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)',
          maxWidth: '500px',
        }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>
            🎭 AI Clone Creator
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: '30px' }}>
            Tạo nhân bản AI của chính bạn với khuôn mặt, giọng nói và tính cách giống hệt bạn
          </p>

          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ padding: '15px', background: 'rgba(255,154,86,0.2)', borderRadius: '10px' }}>
                📸 Quét khuôn mặt
              </div>
              <div style={{ padding: '15px', background: 'rgba(255,154,86,0.2)', borderRadius: '10px' }}>
                🎨 Tạo 3D Avatar
              </div>
              <div style={{ padding: '15px', background: 'rgba(255,154,86,0.2)', borderRadius: '10px' }}>
                🗣️ Nói chuyện AI
              </div>
            </div>
          </div>

          <button
            onClick={startWebcam}
            style={{
              padding: '15px 40px',
              fontSize: '1.2rem',
              background: 'linear-gradient(135deg, #ff9a56 0%, #ff7043 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 10px 30px rgba(255,112,67,0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = 'none';
            }}
          >
            🚀 Bắt đầu tạo Clone
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'scanning') {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
      }}>
        <h2 style={{ marginBottom: '20px' }}>📸 Quét khuôn mặt của bạn</h2>

        <div style={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <video
            ref={videoRef}
            style={{
              width: '640px',
              maxWidth: '90vw',
              transform: 'scaleX(-1)',
              borderRadius: '20px',
            }}
            autoPlay
            playsInline
          />

          {/* Face guide overlay */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '250px',
            height: '320px',
            border: '3px dashed rgba(255,154,86,0.8)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }} />

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {scanProgress > 0 && scanProgress < 100 && (
          <div style={{ marginTop: '20px', width: '300px' }}>
            <div style={{
              height: '10px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '5px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${scanProgress}%`,
                background: 'linear-gradient(90deg, #ff9a56, #ff7043)',
                transition: 'width 0.3s',
              }} />
            </div>
            <p style={{ textAlign: 'center', marginTop: '10px' }}>
              Đang quét... {scanProgress}%
            </p>
          </div>
        )}

        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
          <button
            onClick={scanFace}
            disabled={scanProgress > 0 && scanProgress < 100}
            style={{
              padding: '15px 30px',
              fontSize: '1rem',
              background: scanProgress > 0 ? '#ccc' : 'linear-gradient(135deg, #ff9a56 0%, #ff7043 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              cursor: scanProgress > 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {scanProgress === 100 ? '✅ Hoàn thành!' : '📷 Chụp & Quét'}
          </button>

          <button
            onClick={() => setMode('avatar')}
            style={{
              padding: '15px 30px',
              fontSize: '1rem',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '25px',
              cursor: 'pointer',
            }}
          >
            Bỏ qua →
          </button>
        </div>
      </div>
    );
  }

  // Avatar mode
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Chat Panel */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        width: '380px',
        maxHeight: '60vh',
        background: 'rgba(26,26,46,0.95)',
        borderRadius: '20px',
        padding: '20px',
        color: 'white',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      }}>
        <h3 style={{
          color: '#ff9a56',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          🎭 AI Clone của bạn
          {isSpeaking && <span style={{ fontSize: '12px', color: '#4ECDC4' }}>🔊 Đang nói...</span>}
        </h3>

        {/* Chat history */}
        <div style={{
          maxHeight: '200px',
          overflowY: 'auto',
          marginBottom: '15px',
          padding: '10px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '10px',
        }}>
          {chatHistory.map((chat, i) => (
            <div key={i} style={{
              marginBottom: '10px',
              textAlign: chat.role === 'user' ? 'right' : 'left',
            }}>
              <span style={{
                display: 'inline-block',
                padding: '8px 12px',
                borderRadius: '15px',
                background: chat.role === 'user' ? '#ff7043' : 'rgba(255,255,255,0.1)',
                maxWidth: '80%',
                fontSize: '14px',
              }}>
                {chat.content}
              </span>
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(message)}
            placeholder="Nói chuyện với clone của bạn..."
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '25px',
              border: 'none',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              outline: 'none',
            }}
          />
          <button
            onClick={startListening}
            disabled={isListening || isSpeaking}
            style={{
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              border: 'none',
              background: isListening ? '#FF6B6B' : '#4ECDC4',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            🎤
          </button>
          <button
            onClick={() => sendMessage(message)}
            disabled={isSpeaking}
            style={{
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              border: 'none',
              background: '#ff7043',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            💬
          </button>
        </div>

        {/* Expression buttons */}
        <div style={{
          marginTop: '15px',
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
        }}>
          {['neutral', 'happy', 'sad', 'angry', 'surprised'].map(exp => (
            <button
              key={exp}
              onClick={() => setExpression(exp)}
              style={{
                padding: '8px 12px',
                borderRadius: '15px',
                border: expression === exp ? '2px solid #ff7043' : '2px solid transparent',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {exp === 'neutral' && '😐'}
              {exp === 'happy' && '😊'}
              {exp === 'sad' && '😢'}
              {exp === 'angry' && '😠'}
              {exp === 'surprised' && '😮'}
            </button>
          ))}
        </div>
      </div>

      {/* Rescan button */}
      <button
        onClick={() => {
          setMode('setup');
          setFaceData(null);
        }}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          padding: '10px 20px',
          background: 'rgba(255,255,255,0.1)',
          border: '2px solid rgba(255,255,255,0.2)',
          borderRadius: '25px',
          color: 'white',
          cursor: 'pointer',
        }}
      >
        📸 Quét lại khuôn mặt
      </button>
    </div>
  );
};

export default Avatar3D;
