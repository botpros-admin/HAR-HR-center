'use client';

import React, { useEffect, useRef } from 'react';

interface SecureSignatureFrameProps {
  width: number;
  height: number;
  serialNumber: string;
}

export function SecureSignatureFrame({ width, height, serialNumber }: SecureSignatureFrameProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate QR code pattern
  useEffect(() => {
    if (!qrCanvasRef.current) return;

    const canvas = qrCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 32;
    const cellSize = 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';

    // Create pseudo-random pattern based on serial number
    const seed = serialNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let random = seed;

    const pseudoRandom = () => {
      random = (random * 1103515245 + 12345) & 0x7fffffff;
      return random / 0x7fffffff;
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
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Fine-line background pattern */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.02 }}>
        <defs>
          <pattern id={`finelines-${serialNumber}`} x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
            <path d="M 0,0 L 3,3 M 3,0 L 0,3" stroke="currentColor" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#finelines-${serialNumber})`} />
      </svg>

      {/* Guilloché border pattern */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.18 }}>
        <defs>
          {/* Enhanced wave patterns for borders */}
          <pattern id={`guilloche-h-${serialNumber}`} x="0" y="0" width="16" height="6" patternUnits="userSpaceOnUse">
            <path
              d="M 0,3 Q 4,0 8,3 T 16,3"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.7"
            />
            <path
              d="M 0,3 Q 4,6 8,3 T 16,3"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.7"
            />
          </pattern>

          <pattern id={`guilloche-v-${serialNumber}`} x="0" y="0" width="6" height="16" patternUnits="userSpaceOnUse">
            <path
              d="M 3,0 Q 0,4 3,8 T 3,16"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.7"
            />
            <path
              d="M 3,0 Q 6,4 3,8 T 3,16"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.7"
            />
          </pattern>

          {/* Enhanced rosette pattern */}
          <g id={`rosette-${serialNumber}`}>
            <circle cx="0" cy="0" r="10" fill="none" stroke="currentColor" strokeWidth="0.4" />
            <circle cx="0" cy="0" r="8" fill="none" stroke="currentColor" strokeWidth="0.4" />
            <circle cx="0" cy="0" r="6" fill="none" stroke="currentColor" strokeWidth="0.4" />
            <circle cx="0" cy="0" r="4" fill="none" stroke="currentColor" strokeWidth="0.4" />
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i * 22.5 * Math.PI) / 180;
              const x1 = Math.cos(angle) * 4;
              const y1 = Math.sin(angle) * 4;
              const x2 = Math.cos(angle) * 10;
              const y2 = Math.sin(angle) * 10;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth="0.4"
                />
              );
            })}
            <circle cx="0" cy="0" r="1.5" fill="currentColor" />
          </g>
        </defs>

        {/* Borders */}
        <rect x="0" y="0" width="100%" height="6" fill={`url(#guilloche-h-${serialNumber})`} />
        <rect x="0" y="calc(100% - 6px)" width="100%" height="6" fill={`url(#guilloche-h-${serialNumber})`} />
        <rect x="0" y="0" width="6" height="100%" fill={`url(#guilloche-v-${serialNumber})`} />
        <rect x="calc(100% - 6px)" y="0" width="6" height="100%" fill={`url(#guilloche-v-${serialNumber})`} />

        {/* Corner rosettes */}
        <g transform="translate(12, 12)">
          <use href={`#rosette-${serialNumber}`} />
        </g>
        <g transform={`translate(${width - 12}, 12)`}>
          <use href={`#rosette-${serialNumber}`} />
        </g>
        <g transform={`translate(12, ${height - 12})`}>
          <use href={`#rosette-${serialNumber}`} />
        </g>
        <g transform={`translate(${width - 12}, ${height - 12})`}>
          <use href={`#rosette-${serialNumber}`} />
        </g>
      </svg>

      {/* Microtext band - top */}
      <div className="absolute top-0 left-0 right-0 h-5 flex items-center justify-center overflow-hidden">
        <div className="text-[3.5px] text-gray-500 opacity-35 whitespace-nowrap tracking-widest font-mono uppercase">
          SECURE ELECTRONIC SIGNATURE • LEGALLY BINDING • ENCRYPTED • VERIFIED • ESIGN COMPLIANT • SECURE ELECTRONIC SIGNATURE • LEGALLY BINDING • ENCRYPTED •
        </div>
      </div>

      {/* Microtext band - bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-5 flex items-center justify-center overflow-hidden">
        <div className="text-[3.5px] text-gray-500 opacity-35 whitespace-nowrap tracking-widest font-mono uppercase">
          AUTHENTICATED • TIMESTAMPED • TAMPER-PROOF • FEDERAL STANDARD • AUTHENTICATED • TIMESTAMPED • TAMPER-PROOF • FEDERAL STANDARD •
        </div>
      </div>

      {/* QR Code - bottom right */}
      <div className="absolute bottom-5 right-5">
        <canvas
          ref={qrCanvasRef}
          width={32}
          height={32}
          className="opacity-8"
        />
      </div>

      {/* Serial number - top right */}
      <div className="absolute top-5 right-5">
        <div className="text-[5px] font-mono text-gray-500 opacity-25 tracking-widest font-semibold">
          {serialNumber}
        </div>
      </div>

      {/* Document security watermark - center */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.015 }}>
        <div className="text-[40px] font-bold text-gray-900 tracking-wider transform rotate-[-15deg] select-none">
          AUTHENTICATED
        </div>
      </div>
    </div>
  );
}
