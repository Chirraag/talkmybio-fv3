import React, { useState } from 'react';
import { useSpring, animated } from '@react-spring/web';

export const ThreeDBookIcon: React.FC<{
  imageUrl: string;
  title: string;
  onOpen: () => void;
}> = ({ imageUrl, title, onOpen }) => {
  const [hovered, setHovered] = useState(false);

  const { transform, shadow, scale } = useSpring({
    transform: hovered ? 'perspective(1000px) rotateY(-35deg)' : 'perspective(1000px) rotateY(-10deg)',
    shadow: hovered ? '0 25px 50px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.2)',
    scale: hovered ? 1.1 : 1,
    config: { mass: 1, tension: 300, friction: 30 },
  });

  return (
    <animated.div
      className="relative cursor-pointer"
      style={{
        transform: scale.to(s => `scale(${s})`),
        transformStyle: 'preserve-3d',
        width: '400px',
        height: '600px',
      }}
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <animated.div
        style={{
          transform,
          boxShadow: shadow,
          transformStyle: 'preserve-3d',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Front Cover */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '4px 8px 8px 4px',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 flex flex-col justify-end rounded-r-lg">
            <h2 className="text-3xl font-bold text-white mb-2 font-serif">{title}</h2>
          </div>
        </div>

        {/* Spine */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '40px',
            height: '100%',
            background: 'linear-gradient(to right, rgba(0,0,0,0.2), rgba(0,0,0,0))',
            transform: 'rotateY(90deg) translateZ(-20px) translateX(-20px)',
            transformOrigin: '0 50%',
          }}
        />

        {/* Pages */}
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            bottom: 4,
            width: '30px',
            background: '#fff',
            borderRadius: '0 2px 2px 0',
            transformOrigin: 'left',
            transform: 'translateX(-1px)',
          }}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={`page-${i}`}
              style={{
                position: 'absolute',
                top: 0,
                right: i * 0.5,
                bottom: 0,
                width: '30px',
                background: '#f8f5e9',
                borderRadius: '0 2px 2px 0',
                transform: `translateZ(${-i}px)`,
              }}
            />
          ))}
        </div>
      </animated.div>
    </animated.div>
  );
};