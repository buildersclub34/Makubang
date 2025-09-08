import React, { useState, useRef, TouchEvent, MouseEvent } from 'react';
import { addToCart } from './cart-management';

interface SwipeGesturesProps {
  video: any;
  onInstantBuy: () => void;
  children: React.ReactNode;
  className?: string;
}

export default function SwipeGestures({ video, onInstantBuy, children, className = '' }: SwipeGesturesProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 100; // Minimum distance to trigger action

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setCurrentX(clientX);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;

    const deltaX = clientX - startX;
    setCurrentX(clientX);
    setTranslateX(deltaX);
  };

  const handleEnd = () => {
    if (!isDragging) return;

    const deltaX = currentX - startX;
    const absX = Math.abs(deltaX);

    if (absX > threshold) {
      if (deltaX > 0) {
        // Swipe right - instant buy
        handleInstantBuy();
      } else {
        // Swipe left - add to cart
        handleAddToCart();
      }
    }

    // Reset
    setIsDragging(false);
    setTranslateX(0);
    setStartX(0);
    setCurrentX(0);
  };

  const handleAddToCart = () => {
    if (!video) return;

    addToCart({
      menuItemId: video._id || video.id,
      name: video.title || video.name,
      price: video.price || 299,
      restaurantId: video.restaurantId || video.restaurant?._id,
      restaurantName: video.restaurant?.name || 'Unknown Restaurant',
      image: video.thumbnailUrl
    });

    // Show feedback
    showFeedback('Added to cart! 🛒', 'left');
  };

  const handleInstantBuy = () => {
    showFeedback('Quick order! 🚀', 'right');
    onInstantBuy();
  };

  const showFeedback = (message: string, direction: 'left' | 'right') => {
    // Create temporary feedback element
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.className = `fixed z-50 top-1/2 transform -translate-y-1/2 bg-black/80 text-white px-4 py-2 rounded-lg font-medium pointer-events-none ${
      direction === 'left' ? 'left-4' : 'right-4'
    }`;
    
    document.body.appendChild(feedback);
    
    // Animate in
    feedback.style.opacity = '0';
    feedback.style.transform = `translateY(-50%) translateX(${direction === 'left' ? '-20px' : '20px'})`;
    
    requestAnimationFrame(() => {
      feedback.style.transition = 'all 0.3s ease';
      feedback.style.opacity = '1';
      feedback.style.transform = 'translateY(-50%) translateX(0)';
    });

    // Remove after delay
    setTimeout(() => {
      feedback.style.opacity = '0';
      feedback.style.transform = `translateY(-50%) translateX(${direction === 'left' ? '-20px' : '20px'})`;
      setTimeout(() => document.body.removeChild(feedback), 300);
    }, 2000);
  };

  // Touch events
  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    handleEnd();
  };

  // Mouse events (for desktop testing)
  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    handleMove(e.clientX);
  };

  const handleMouseUp = (e: MouseEvent) => {
    e.preventDefault();
    handleEnd();
  };

  const getSwipeIndicators = () => {
    const absX = Math.abs(translateX);
    const opacity = Math.min(absX / threshold, 1);

    if (translateX > 20) {
      // Swiping right - instant buy
      return (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-transparent pointer-events-none z-10"
          style={{ opacity }}
        >
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              🚀 Instant Buy
            </div>
          </div>
        </div>
      );
    } else if (translateX < -20) {
      // Swiping left - add to cart
      return (
        <div 
          className="absolute inset-0 bg-gradient-to-l from-blue-500/20 to-transparent pointer-events-none z-10"
          style={{ opacity }}
        >
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              🛒 Add to Cart
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        transform: `translateX(${translateX}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleEnd}
    >
      {children}
      {getSwipeIndicators()}
      
      {/* Swipe hints */}
      {!isDragging && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-black/50 text-white px-3 py-1 rounded-full text-xs">
            ← Add to Cart | Instant Buy →
          </div>
        </div>
      )}
    </div>
  );
}
