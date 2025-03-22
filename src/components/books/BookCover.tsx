import React, { useState } from 'react';
import { useSpring, animated } from '@react-spring/web';

export const BookCover: React.FC<{
  imageUrl: string;
  title: string;
  onOpen: () => void;
}> = ({ imageUrl, title, onOpen }) => {
  const [isHovered, setIsHovered] = useState(false);

  const { transform, opacity, shadow } = useSpring({
    transform: isHovered 
      ? 'perspective(1000px) rotateY(-30deg) scale(1.05)' 
      : 'perspective(1000px) rotateY(-15deg) scale(1)',
    opacity: isHovered ? 1 : 0.8,
    shadow: isHovered 
      ? '0 25px 50px rgba(0,0,0,0.3)' 
      : '0 10px 20px rgba(0,0,0,0.2)',
    config: {
      mass: 1,
      tension: 280,
      friction: 20
    }
  });

  return (
    <animated.div
      className="relative cursor-pointer"
      style={{
        transform,
        boxShadow: shadow,
        width: '300px',
        height: '400px',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onOpen}
    >
      {/* Book Cover */}
      <div
        className="absolute inset-0 rounded-lg overflow-hidden"
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
        >
          <animated.div 
            className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"
            style={{ opacity }}
          >
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
              <p className="text-white/80 text-sm">Click to Open</p>
            </div>
          </animated.div>
        </div>
      </div>

      {/* Book Spine */}
      <div
        className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/30 to-transparent"
        style={{
          transform: 'rotateY(-90deg) translateX(-4px)',
          transformOrigin: 'left',
        }}
      />

      {/* Book Pages */}
      <div
        className="absolute right-0 top-2 bottom-2 w-4 bg-[#f1f1f1] rounded-r"
        style={{
          transform: 'translateX(2px)',
        }}
      >
        {/* Individual page layers */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 bg-[#f1f1f1] rounded-r"
            style={{
              transform: `translateX(${i * 0.5}px)`,
              boxShadow: 'inset -1px 0 rgba(0,0,0,0.05)',
            }}
          />
        ))}
      </div>
    </animated.div>
  );
};