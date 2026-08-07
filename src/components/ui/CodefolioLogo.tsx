'use client';

import React from 'react';

export interface CodefolioLogoProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

export const CodefolioLogo: React.FC<CodefolioLogoProps> = ({ 
  className = '', 
  size = 36,
  animated = true
}) => {
  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 group ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer Breathing Ambient Glow */}
      {animated && (
        <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-cyan-500/50 via-indigo-500/50 to-purple-600/50 opacity-75 blur-md group-hover:opacity-100 transition duration-300" />
      )}
      
      {/* Brand Logo Container */}
      <div 
        style={{ width: size, height: size }}
        className="relative z-10 flex items-center justify-center w-full h-full"
      >
        <img
          src="/codefolio-logo.png"
          alt="Codefolio Logo"
          width={size}
          height={size}
          className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300 ease-out antialiased"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const svgFallback = e.currentTarget.nextElementSibling;
            if (svgFallback) (svgFallback as HTMLElement).style.display = 'block';
          }}
        />

        {/* Crisp Vector SVG Fallback */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md hidden"
        >
          <rect x="2" y="2" width="44" height="44" rx="12" fill="#0F172A" stroke="#6366F1" strokeWidth="1.5" />
          <path d="M 17 16 L 11 24 L 17 32" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 31 16 L 37 24 L 31 32" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 27 14 L 21 34" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};



