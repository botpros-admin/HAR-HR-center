'use client';

import React, { useEffect, useRef } from 'react';

interface SecureSignatureBoxProps {
  signatureDataUrl: string;
  timestamp?: number;
  employeeId?: string;
}

export function SecureSignatureBox({ signatureDataUrl, timestamp, employeeId }: SecureSignatureBoxProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate unique serial number
  const serialNumber = React.useMemo(() => {
    const ts = timestamp || Date.now();
    const id = employeeId || 'UNKNOWN';
    const hash = ts.toString(36).toUpperCase() + id.substring(0, 4).toUpperCase();
    return `HSC-${hash}`;
  }, [timestamp, employeeId]);

  // Generate QR code
  useEffect(() => {
    if (!qrCanvasRef.current) return;

    const canvas = qrCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple QR-like pattern (decorative only)
    const size = 40;
    const cellSize = 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';

    // Create a pseudo-random pattern based on serial number
    const seed = serialNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let random = seed;

    const pseudoRandom = () => {
      random = (random * 1103515245 + 12345) & 0x7fffffff;
      return (random / 0x7fffffff);
    };

    for (let y = 0; y < size / cellSize; y++) {
      for (let x = 0; x < size / cellSize; x++) {
        if (pseudoRandom() > 0.5) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }, [serialNumber]);

  return (
    <div className="relative w-full h-full">
      {/* Fine-line background pattern */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.03 }}>
        <defs>
          <pattern id="finelines" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M 0,0 L 4,4 M 4,0 L 0,4" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#finelines)" />
      </svg>

      {/* Guilloché border pattern */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
        <defs>
          {/* Top/Bottom wave pattern */}
          <pattern id="guilloche-h" x="0" y="0" width="20" height="8" patternUnits="userSpaceOnUse">
            <path
              d="M 0,4 Q 5,0 10,4 T 20,4"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            <path
              d="M 0,4 Q 5,8 10,4 T 20,4"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
            />
          </pattern>

          {/* Left/Right wave pattern */}
          <pattern id="guilloche-v" x="0" y="0" width="8" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 4,0 Q 0,5 4,10 T 4,20"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            <path
              d="M 4,0 Q 8,5 4,10 T 4,20"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
            />
          </pattern>

          {/* Rosette pattern */}
          <g id="rosette">
            <circle cx="0" cy="0" r="12" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="0" cy="0" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="0" cy="0" r="8" fill="none" stroke="currentColor" strokeWidth="0.5" />
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = Math.cos(angle) * 6;
              const y1 = Math.sin(angle) * 6;
              const x2 = Math.cos(angle) * 12;
              const y2 = Math.sin(angle) * 12;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              );
            })}
            <circle cx="0" cy="0" r="2" fill="currentColor" />
          </g>
        </defs>

        {/* Top border */}
        <rect x="0" y="0" width="100%" height="8" fill="url(#guilloche-h)" />
        {/* Bottom border */}
        <rect x="0" y="calc(100% - 8px)" width="100%" height="8" fill="url(#guilloche-h)" />
        {/* Left border */}
        <rect x="0" y="0" width="8" height="100%" fill="url(#guilloche-v)" />
        {/* Right border */}
        <rect x="calc(100% - 8px)" y="0" width="8" height="100%" fill="url(#guilloche-v)" />

        {/* Corner rosettes */}
        <g transform="translate(14, 14)">
          <use href="#rosette" />
        </g>
        <g transform="translate(calc(100% - 14px), 14)">
          <use href="#rosette" />
        </g>
        <g transform="translate(14, calc(100% - 14px))">
          <use href="#rosette" />
        </g>
        <g transform="translate(calc(100% - 14px), calc(100% - 14px))">
          <use href="#rosette" />
        </g>
      </svg>

      {/* Microtext band - top */}
      <div className="absolute top-0 left-0 right-0 h-6 flex items-center justify-center overflow-hidden pointer-events-none">
        <div className="text-[4px] text-gray-400 opacity-40 whitespace-nowrap tracking-wider font-mono">
          SECURE ELECTRONIC SIGNATURE • LEGALLY BINDING • ENCRYPTED • VERIFIED • SECURE ELECTRONIC SIGNATURE • LEGALLY BINDING • ENCRYPTED • VERIFIED •
        </div>
      </div>

      {/* Microtext band - bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-6 flex items-center justify-center overflow-hidden pointer-events-none">
        <div className="text-[4px] text-gray-400 opacity-40 whitespace-nowrap tracking-wider font-mono">
          AUTHENTICATED • TIMESTAMPED • COMPLIANT • ESIGN ACT • AUTHENTICATED • TIMESTAMPED • COMPLIANT • ESIGN ACT •
        </div>
      </div>

      {/* QR Code - bottom right */}
      <div className="absolute bottom-8 right-8 pointer-events-none">
        <canvas
          ref={qrCanvasRef}
          width={40}
          height={40}
          className="opacity-10"
        />
      </div>

      {/* Serial number - top right */}
      <div className="absolute top-8 right-8 pointer-events-none">
        <div className="text-[6px] font-mono text-gray-400 opacity-30 tracking-widest">
          {serialNumber}
        </div>
      </div>

      {/* Signature image */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <img
          src={signatureDataUrl}
          alt="Signature"
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </div>
  );
}
