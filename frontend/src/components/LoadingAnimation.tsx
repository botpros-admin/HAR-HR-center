'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface LoadingAnimationProps {
  onComplete?: () => void;
  duration?: number; // Total duration in milliseconds (default: 2250ms)
  fadeInDuration?: number; // Fade in duration in milliseconds (default: 300ms)
  fadeOutDuration?: number; // Fade out duration in milliseconds (default: 300ms)
  modalMode?: boolean; // If true, displays in modal-sized container instead of full screen
}

export function LoadingAnimation({
  onComplete,
  duration = 2250,
  fadeInDuration = 300,
  fadeOutDuration = 300,
  modalMode = false,
}: LoadingAnimationProps) {
  const [opacity, setOpacity] = useState(0);
  const [animationData, setAnimationData] = useState(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Load animation data
  useEffect(() => {
    fetch('/animations/signature.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error('Failed to load animation:', err));
  }, []);

  useEffect(() => {
    if (!animationData) return;

    // Calculate timings
    const displayDuration = duration - fadeInDuration - fadeOutDuration;
    const fadeOutStart = fadeInDuration + displayDuration;

    // Fade in
    setOpacity(1);

    // Start fade out
    const fadeOutTimer = setTimeout(() => {
      setOpacity(0);
    }, fadeOutStart);

    // Complete callback
    const completeTimer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, duration);

    timeoutRef.current = completeTimer;

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
  }, [animationData, duration, fadeInDuration, fadeOutDuration, onComplete]);

  if (!animationData) return null;

  // Modal mode: centered in a modal-sized container
  if (modalMode) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        style={{
          opacity,
          transition: `opacity ${opacity === 1 ? fadeInDuration : fadeOutDuration}ms ease-in-out`,
          pointerEvents: opacity === 0 ? 'none' : 'auto',
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center gap-4">
            {/* Lottie Animation */}
            <div className="w-48 h-48 flex items-center justify-center">
              <Lottie
                animationData={animationData}
                loop={true}
                autoplay={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            {/* Loading text */}
            <div className="text-center">
              <p className="text-gray-700 text-lg font-semibold">
                Preparing document...
              </p>
              <p className="text-gray-500 text-sm mt-1">
                This will only take a moment
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full screen mode (default)
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50"
      style={{
        opacity,
        transition: `opacity ${opacity === 1 ? fadeInDuration : fadeOutDuration}ms ease-in-out`,
        pointerEvents: opacity === 0 ? 'none' : 'auto',
      }}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Lottie Animation */}
        <div className="w-64 h-64 flex items-center justify-center">
          <Lottie
            animationData={animationData}
            loop={true}
            autoplay={true}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Optional loading text */}
        <div className="text-center">
          <p className="text-gray-600 text-lg font-medium animate-pulse">
            Loading...
          </p>
        </div>
      </div>
    </div>
  );
}
