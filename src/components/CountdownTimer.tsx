import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: Date;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const formatNumber = (num: number): string => num.toString().padStart(2, '0');

  return (
    <div className="flex items-center space-x-4 font-mono">
      {timeLeft.days > 0 && (
        <div className="flex items-baseline">
          <span className="text-lg font-bold">{timeLeft.days}</span>
          <span className="text-xs ml-1">d</span>
        </div>
      )}
      <div className="flex items-baseline">
        <span className="text-lg font-bold">{formatNumber(timeLeft.hours)}</span>
        <span className="text-xs ml-1">h</span>
      </div>
      <div className="flex items-baseline">
        <span className="text-lg font-bold">{formatNumber(timeLeft.minutes)}</span>
        <span className="text-xs ml-1">m</span>
      </div>
      <div className="flex items-baseline">
        <span className="text-lg font-bold">{formatNumber(timeLeft.seconds)}</span>
        <span className="text-xs ml-1">s</span>
      </div>
    </div>
  );
};