import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  bodyClassName?: string;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  bodyClassName,
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

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="modal-backdrop"
        onClick={onClose}
        onTouchMove={handleBackdropTouchMove}
      />
      <div className="modal-gold-wash" aria-hidden="true" />

      {/* Modal Content - centered, max 85% of viewport */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "modal-sheet relative w-full sm:max-w-lg glass-card flex flex-col",
          className
        )}
        style={{ maxHeight: '85%' }}
      >
        {/* Header - always visible */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 sm:px-6 sm:py-4 shrink-0">
          <h3 className="text-xl font-bold text-white">
            {title}
          </h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="btn btn-gold shrink-0"
            >
              OK
            </button>
          )}
        </div>

        {/* Body - independently scrollable */}
        <div 
          className={cn("px-5 py-4 sm:px-6 overflow-y-auto flex-1 min-h-0", bodyClassName)}
          style={{ overscrollBehavior: 'contain' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
