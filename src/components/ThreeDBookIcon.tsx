import React, { useState } from 'react';
import { useSpring, animated } from '@react-spring/web';

/**
 * ThreeDBookIcon
 * A 3D-like book component that shows a single “cover.”
 * When clicked, it calls onOpen() to trigger BookViewer to show the real flipbook.
 */
export const ThreeDBookIcon: React.FC<{
  imageUrl: string;
  title: string;
  onOpen: () => void;
}> = ({ imageUrl, title, onOpen }) => {
  const [hovered, setHovered] = useState(false);

  // Slight “tilt” animation on hover for effect. Tweak to your liking.
  const { transform } = useSpring({
    transform: hovered ? 'rotateY(-5deg)' : 'rotateY(0deg)',
    config: { mass: 1, tension: 210, friction: 20 },
  });

  return (
    <div
      className="relative cursor-pointer"
      style={{
        // Perspective so child transforms appear 3D
        perspective: '1000px',
        width: '260px',
        height: '360px',
      }}
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <animated.div
        style={{
          transform,
          transformStyle: 'preserve-3d',
          width: '100%',
          height: '100%',
        }}
        className="transition-transform duration-700 ease-in-out"
      >
        {/* FRONT COVER */}
        <div
          style={{
            backfaceVisibility: 'hidden', // hide backside
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          className="absolute inset-0 rounded-lg shadow-2xl flex flex-col justify-end p-4 bg-black bg-opacity-50"
        >
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-white text-sm">Click to Open</p>
        </div>

        {/* BACK COVER (optional, if you want a real backside) */}
        <div
          style={{
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            backgroundColor: '#1f1f1f',
          }}
          className="absolute inset-0 rounded-lg"
        />
      </animated.div>
    </div>
  );
};
