import React, { useEffect, useState } from 'react';
import './CharacterMascot.css';

const CharacterMascot = ({ animationState }) => {
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setIsRunning(animationState.includes('run'));
  }, [animationState]);

  return (
    <div className={`character-container ${animationState}`}>
      {/* Character SVG */}
      <svg
        className={`character ${animationState}`}
        viewBox="0 0 100 120"
        width="100"
        height="120"
      >
        {/* Head */}
        <circle cx="50" cy="25" r="12" fill="#FF6B6B" strokeWidth="2" stroke="#333" />

        {/* Eyes */}
        <circle cx="46" cy="23" r="2" fill="#333" />
        <circle cx="54" cy="23" r="2" fill="#333" />

        {/* Smile */}
        <path
          d="M 46 28 Q 50 30 54 28"
          stroke="#333"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Body */}
        <rect x="42" y="37" width="16" height="20" fill="#4ECDC4" rx="2" strokeWidth="2" stroke="#333" />

        {/* Arms (left raised for running) */}
        <line x1="42" y1="40" x2="32" y2="32" stroke="#FF6B6B" strokeWidth="3" strokeLinecap="round" />
        <line x1="58" y1="40" x2="68" y2="48" stroke="#FF6B6B" strokeWidth="3" strokeLinecap="round" />

        {/* Hands */}
        <circle cx="32" cy="32" r="3" fill="#FF6B6B" strokeWidth="2" stroke="#333" />
        <circle cx="68" cy="48" r="3" fill="#FF6B6B" strokeWidth="2" stroke="#333" />

        {/* Legs (running motion) */}
        <line x1="45" y1="57" x2="42" y2="75" stroke="#333" strokeWidth="3" strokeLinecap="round" />
        <line x1="55" y1="57" x2="58" y2="75" stroke="#333" strokeWidth="3" strokeLinecap="round" />

        {/* Shoes */}
        <ellipse cx="42" cy="77" rx="4" ry="3" fill="#FF9A56" strokeWidth="1.5" stroke="#333" />
        <ellipse cx="58" cy="77" rx="4" ry="3" fill="#FF9A56" strokeWidth="1.5" stroke="#333" />

        {/* Stick/Club held in hand */}
        <g className="stick">
          <line x1="32" y1="32" x2="18" y2="12" stroke="#8B4513" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="18" cy="12" r="5" fill="#D2691E" stroke="#333" strokeWidth="1.5" />
          {/* Stick details */}
          <line x1="20" y1="10" x2="16" y2="14" stroke="#333" strokeWidth="1" opacity="0.5" />
        </g>

        {/* Motion lines (dust effect) */}
        <g className="motion-lines" opacity="0.6">
          <line x1="65" y1="50" x2="75" y2="48" stroke="#FFD93D" strokeWidth="2" strokeLinecap="round" />
          <line x1="67" y1="60" x2="78" y2="62" stroke="#FFD93D" strokeWidth="2" strokeLinecap="round" />
          <line x1="62" y1="70" x2="75" y2="75" stroke="#FFD93D" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>

      {/* Shadow under character */}
      <div className="character-shadow"></div>

      {/* Dust particles */}
      <div className="dust-particle dust-1"></div>
      <div className="dust-particle dust-2"></div>
      <div className="dust-particle dust-3"></div>
    </div>
  );
};

export default CharacterMascot;
