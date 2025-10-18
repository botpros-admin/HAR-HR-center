'use client';

import React, { useState, useEffect } from 'react';
import { X, PenTool, Save, Check } from 'lucide-react';
import { SignatureCanvas } from './SignatureCanvas';
import { SecureSignatureFrame } from './SecureSignatureFrame';

interface AdoptSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'signature' | 'initials';
  onSave: (dataUrl: string) => Promise<void>;
  defaultName?: string;
}

// Signature font styles with Google Fonts
const SIGNATURE_FONTS = [
  { name: 'Dancing Script', class: 'font-dancing' },
  { name: 'Great Vibes', class: 'font-great-vibes' },
  { name: 'Allura', class: 'font-allura' },
];

export function AdoptSignatureModal({
  isOpen,
  onClose,
  type,
  onSave,
  defaultName = '',
}: AdoptSignatureModalProps) {
  const [signatureMethod, setSignatureMethod] = useState<'draw' | 'type'>('type');
  const [selectedFont, setSelectedFont] = useState(0);
  const [typedName, setTypedName] = useState(defaultName);
  const [tempSignature, setTempSignature] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentSerialNumber, setCurrentSerialNumber] = useState<string>('');

  // Detect touch device
  useEffect(() => {
    const hasTouchScreen =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
    setIsTouchDevice(hasTouchScreen);
  }, []);

  // Generate unique serial number when modal opens
  useEffect(() => {
    if (isOpen) {
      const timestamp = Date.now();
      const serialNumber = `HSC-${timestamp.toString(36).toUpperCase()}-PROFILE`;
      setCurrentSerialNumber(serialNumber);

      // Set default method based on device
      setSignatureMethod(isTouchDevice ? 'draw' : 'type');
      setTypedName(defaultName);
    }
  }, [isOpen, isTouchDevice, defaultName]);

  // Generate typed signature with selected font
  const generateTypedSignature = (name: string, fontClass: string, isInitials: boolean = false): string => {
    const canvas = document.createElement('canvas');
    canvas.width = isInitials ? 300 : 500;
    canvas.height = isInitials ? 150 : 200;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dynamic font sizing
    let fontSize = isInitials ? 48 : 64;
    const minFontSize = isInitials ? 24 : 32;
    const maxWidth = canvas.width * 0.9;

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Map font class to actual font family
    const fontFamilyMap: Record<string, string> = {
      'font-dancing': 'Dancing Script',
      'font-great-vibes': 'Great Vibes',
      'font-allura': 'Allura',
    };

    const fontFamily = fontFamilyMap[fontClass] || 'Dancing Script';

    // Find the right font size
    while (fontSize > minFontSize) {
      ctx.font = `${fontSize}px "${fontFamily}", cursive`;
      const metrics = ctx.measureText(name);
      if (metrics.width <= maxWidth) break;
      fontSize -= 2;
    }

    // Draw the name
    ctx.font = `${fontSize}px "${fontFamily}", cursive`;
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png');
  };

  // Update signature when name or font changes
  useEffect(() => {
    if (signatureMethod === 'type' && typedName.trim()) {
      const isInitials = type === 'initials';
      const fontClass = SIGNATURE_FONTS[selectedFont].class;
      const signatureDataUrl = generateTypedSignature(typedName, fontClass, isInitials);
      setTempSignature(signatureDataUrl);
    } else if (signatureMethod === 'type') {
      setTempSignature(null);
    }
  }, [typedName, selectedFont, signatureMethod, type]);

  const handleSaveSignature = (dataUrl: string) => {
    setTempSignature(dataUrl);
  };

  const handleConfirmSignature = async () => {
    if (!tempSignature) return;

    setIsSaving(true);
    try {
      await onSave(tempSignature);
      onClose();
      setTempSignature(null);
      setTypedName('');
    } catch (error) {
      console.error('Error saving signature:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    if (signatureMethod === 'draw') {
      const canvas = document.querySelector('.signature-canvas-adopt canvas') as any;
      if (canvas?.clearSignature) canvas.clearSignature();
    } else {
      setTypedName('');
    }
    setTempSignature(null);
  };

  if (!isOpen) return null;

  const isInitials = type === 'initials';
  const width = isInitials ? 300 : 400;
  const height = isInitials ? 150 : 200;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-4" style={{ background: 'rgba(0,0,0,0.6)', touchAction: 'none' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col" style={{ touchAction: 'auto' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <PenTool className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold">
                    Adopt Your {isInitials ? 'Initials' : 'Signature'}
                  </h3>
                  <p className="text-xs opacity-90">Choose a style and customize it</p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Method Selector */}
        <div className="px-4 md:px-6 pt-4 bg-gray-50">
          <div className="flex gap-2 bg-gray-200 p-1 rounded-lg">
            <button
              onClick={() => {
                setSignatureMethod('type');
                setTempSignature(null);
              }}
              className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${
                signatureMethod === 'type'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Type &amp; Choose Style</span>
              </div>
            </button>
            <button
              onClick={() => {
                setSignatureMethod('draw');
                setTempSignature(null);
                setTypedName('');
              }}
              className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${
                signatureMethod === 'draw'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <PenTool className="w-4 h-4" />
                <span>Draw</span>
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-gray-50">
          {signatureMethod === 'type' ? (
            <div className="space-y-4">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isInitials ? 'Type your initials' : 'Type your full name'}
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder={isInitials ? 'Enter initials (e.g., JD)' : 'Enter your name'}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-base"
                  autoFocus
                />
              </div>

              {/* Font Style Selection */}
              {typedName.trim() && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Choose Your Style
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {SIGNATURE_FONTS.map((font, index) => (
                        <button
                          key={font.name}
                          onClick={() => setSelectedFont(index)}
                          className={`relative p-4 border-2 rounded-lg transition-all ${
                            selectedFont === index
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 hover:border-gray-400 bg-white'
                          }`}
                        >
                          {/* Checkmark */}
                          {selectedFont === index && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}

                          {/* Font Name */}
                          <div className="text-xs text-gray-600 mb-2">{font.name}</div>

                          {/* Preview */}
                          <div className={`text-3xl ${font.class} text-center`}>
                            {typedName}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Final Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Final Preview
                    </label>
                    <div className="flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg p-6">
                      <div
                        style={{
                          width: `${width}px`,
                          maxWidth: '100%',
                          height,
                          position: 'relative',
                        }}
                      >
                        <SecureSignatureFrame
                          width={width}
                          height={height}
                          serialNumber={currentSerialNumber}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          {tempSignature ? (
                            <img src={tempSignature} alt="Signature preview" className="max-w-full max-h-full object-contain" />
                          ) : (
                            <span className="text-gray-300 text-xs">Preview will appear here...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3 text-center">
                  {isInitials
                    ? (isTouchDevice ? 'Draw your initials with your finger or stylus' : 'Draw your initials using mouse or trackpad')
                    : (isTouchDevice ? 'Draw your signature with your finger or stylus' : 'Draw your signature using mouse or trackpad')}
                </p>
              </div>

              <div className="flex items-center justify-center">
                <div
                  style={{
                    width: `${width}px`,
                    maxWidth: '100%',
                    height,
                    position: 'relative',
                  }}
                >
                  <SecureSignatureFrame
                    width={width}
                    height={height}
                    serialNumber={currentSerialNumber}
                  />

                  <div className="absolute inset-0 signature-canvas-adopt">
                    <SignatureCanvas
                      onSave={handleSaveSignature}
                      onClear={() => setTempSignature(null)}
                      width={width}
                      height={height}
                      showButtons={false}
                      autoSaveOnDraw={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 bg-white">
          {/* Security Notice */}
          <div className="mb-3 flex items-start gap-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p>Your {isInitials ? 'initials are' : 'signature is'} securely stored and legally binding.</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 md:gap-3">
            <button
              onClick={handleClear}
              disabled={!tempSignature}
              className="px-4 py-2 md:py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm md:text-base"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 md:py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm md:text-base"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSignature}
              disabled={!tempSignature || isSaving}
              className="flex-1 px-4 py-2 md:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-sm md:text-base shadow-lg flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Adopt {isInitials ? 'Initials' : 'Signature'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
