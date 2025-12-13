import React, { useState, useEffect } from 'react';
import './FloatingCharacter.css';

const FloatingCharacter = () => {
  const [thought, setThought] = useState(0);
  
  const thoughts = [
    "Đăng nhập sẽ có điều thú vị cho bạn! 😄",
    "Hãy khám phá những tính năng mới!",
    "Bạn sẽ thích dự án này đấy!",
    "Sẵn sàng chưa?",
    "Hành trình bắt đầu tại đây!",
    "Chào mừng bạn! 👋",
    "Không chần chừ nữa!",
    "Ấn nút đi, đừng ngại!",
  ];
  
  // Tính toán kích thước đám mây dựa trên độ dài câu
  const getCloudSize = (text) => {
    const length = text.length;
    if (length < 15) return 190; // Câu ngắn
    if (length < 25) return 240; // Câu vừa
    if (length < 35) return 290; // Câu dài
    return 330; // Câu rất dài
  };
  
  const cloudWidth = getCloudSize(thoughts[thought]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setThought((prev) => (prev + 1) % thoughts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="character-container">
      <div className="character-wrapper">
        {/* Thought Cloud - gắn với nhân vật */}
        <div className="thought-cloud" style={{ width: `${cloudWidth}px` }}>
          <svg viewBox="0 0 160 60" className="cloud-svg">
            {/* Cloud shape */}
            <g className="cloud-shape">
              <path d="M 20 30 Q 20 15 35 15 Q 45 5 60 15 Q 75 5 85 20 Q 100 10 110 25 Q 130 20 140 35 Q 145 50 130 55 Q 115 60 100 55 Q 85 65 70 55 Q 50 65 35 55 Q 15 58 10 45 Q 5 35 20 30" 
                  fill="#fff" stroke="#999" strokeWidth="1.5" />
            </g>
          </svg>
          <div className="thought-text">
            {thoughts[thought]}
          </div>
          
          {/* 2 chấm nhỏ nối từ mây xuống nhân vật */}
          <div className="cloud-dots">
            <div className="dot dot-left"></div>
            <div className="dot dot-right"></div>
          </div>
        </div>
        
        <svg className="character" viewBox="0 0 60 80">
          {/* Head */}
          <circle className="head" cx="30" cy="15" r="10" fill="#f4b041" />
          
          {/* Eyes - blinking */}
          <circle className="eye-left" cx="26" cy="13" r="2" fill="#000" />
          <circle className="eye-right" cx="34" cy="13" r="2" fill="#000" />
          
          {/* Mouth - smile */}
          <path className="mouth" d="M 26 18 Q 30 20 34 18" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          
          {/* Body - jumping */}
          <rect className="body" x="22" y="25" width="16" height="20" rx="3" fill="#4a90e2" />
          
          {/* Left Arm - swinging */}
          <g className="arm-left">
            <rect x="18" y="30" width="4" height="18" rx="2" fill="#f4b041" />
            {/* Hand */}
            <circle cx="20" cy="50" r="2.5" fill="#f4b041" />
          </g>
          
          {/* Right Arm - swinging */}
          <g className="arm-right">
            <rect x="38" y="30" width="4" height="18" rx="2" fill="#f4b041" />
            {/* Hand */}
            <circle cx="40" cy="50" r="2.5" fill="#f4b041" />
          </g>
          
          {/* Left Leg - running */}
          <g className="leg-left">
            <rect x="24" y="45" width="4" height="22" rx="2" fill="#2c3e50" />
            {/* Shoe */}
            <rect x="23" y="67" width="6" height="4" rx="1" fill="#000" />
          </g>
          
          {/* Right Leg - running */}
          <g className="leg-right">
            <rect x="32" y="45" width="4" height="22" rx="2" fill="#2c3e50" />
            {/* Shoe */}
            <rect x="31" y="67" width="6" height="4" rx="1" fill="#000" />
          </g>
        </svg>
      </div>
    </div>
  );
};

export default FloatingCharacter;
