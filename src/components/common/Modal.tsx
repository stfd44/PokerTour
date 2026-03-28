import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge tailwind classes
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
}) => {
  const scrollYRef = useRef(0);

  // Lock body scroll on iOS: position:fixed is the only reliable way
  useEffect(() => {
    if (isOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollYRef.current);
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollYRef.current);
    };
  }, [isOpen]);

  // Block touch moves on the backdrop to prevent background scroll leak
  const handleBackdropTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop - blocks all touch passthrough */}
      <div 
        className="absolute inset-0 bg-poker-black/40 backdrop-blur-sm"
        onClick={onClose}
        onTouchMove={handleBackdropTouchMove}
      />

      {/* Modal Content - centered, max 85% of viewport */}
      <div 
        className={cn(
          "relative w-full sm:max-w-lg bg-white shadow-2xl rounded-2xl flex flex-col",
          className
        )}
        style={{ maxHeight: '85%' }}
      >
        {/* Header - always visible */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 sm:px-6 sm:py-4 shrink-0">
          <h3 className="text-xl font-bold text-poker-black">
            {title}
          </h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Body - independently scrollable */}
        <div 
          className="px-5 py-4 sm:px-6 overflow-y-auto flex-1 min-h-0"
          style={{ overscrollBehavior: 'contain' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
