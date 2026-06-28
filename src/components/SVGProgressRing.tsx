import { useEffect, useState, useMemo } from 'react';
import { formatCurrency } from '../utils';

interface SVGProgressRingProps {
  savedAmount: number;
  goalAmount: number;
  currency: 'AOA' | 'BRL' | 'USD' | 'EUR';
}

export default function SVGProgressRing({ savedAmount, goalAmount, currency }: SVGProgressRingProps) {
  // SVG Config
  const radius = 80;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate percentage
  const percentage = useMemo(() => {
    if (goalAmount <= 0) return 0;
    const pct = (savedAmount / goalAmount) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [savedAmount, goalAmount]);

  // Dashoffset calculation
  const strokeDashoffset = useMemo(() => {
    return circumference - (percentage / 100) * circumference;
  }, [percentage, circumference]);

  // Count-up animation for the center value
  const [displayAmount, setDisplayAmount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = savedAmount;
    if (end === 0) {
      setDisplayAmount(0);
      return;
    }
    
    // Animate over 1.2 seconds
    const duration = 1200;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad
      const easeProgress = progress * (2 - progress);
      const currentVal = Math.floor(easeProgress * end);
      
      setDisplayAmount(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayAmount(end);
      }
    }

    requestAnimationFrame(animate);
  }, [savedAmount]);

  // Remaining days in the month calculation (Relative to June 28, 2026)
  const remainingDaysDetails = useMemo(() => {
    const today = new Date('2026-06-28');
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // Total days in the current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    const currentDay = today.getDate();
    const remaining = totalDays - currentDay;
    
    // Target daily required savings to hit the remaining amount of the goal
    const remainingGoal = Math.max(0, goalAmount - savedAmount);
    const dailyNeeded = remaining > 0 ? remainingGoal / remaining : remainingGoal;
    
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return {
      monthName: monthNames[month],
      year,
      remaining,
      dailyNeeded,
    };
  }, [savedAmount, goalAmount]);

  const isHighProgress = percentage >= 90;

  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-3xl glass transition-all duration-500 hover:shadow-glow relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold block mb-1">
          {remainingDaysDetails.monthName} {remainingDaysDetails.year}
        </span>
        <h3 className="text-lg font-bold font-display text-slate-100">
          Progresso da Poupança Mensal
        </h3>
      </div>

      {/* SVG Ring container with pulse effect when progress > 90% */}
      <div className={`relative flex items-center justify-center w-[220px] h-[220px] ${isHighProgress ? 'animate-pulse-glow' : ''}`}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Gradients */}
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6C63FF" />
              <stop offset="100%" stopColor="#00D4AA" />
            </linearGradient>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
            </filter>
          </defs>
          
          {/* Background Ring */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="transparent"
            stroke="rgba(30, 45, 69, 0.4)"
            strokeWidth={strokeWidth}
          />
          
          {/* Progress Ring with animated strokeDashoffset */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="transparent"
            stroke="url(#ringGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            filter="url(#shadow)"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[26px] font-extrabold text-slate-50 font-display tracking-tight font-tabular">
            {percentage.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-400 font-medium max-w-[130px] truncate">
            {formatCurrency(displayAmount, currency)}
          </span>
          <span className="text-[10px] uppercase text-indigo-400 font-bold mt-1 tracking-wider">
            de {formatCurrency(goalAmount, currency)}
          </span>
        </div>
      </div>

      {/* Bottom Insights */}
      <div className="w-full border-t border-slate-800/60 mt-6 pt-4 flex flex-col gap-2.5 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-lg">🗓</span>
            <span>Dias restantes no mês:</span>
          </div>
          <span className="font-bold text-slate-100 font-tabular">
            {remainingDaysDetails.remaining} {remainingDaysDetails.remaining === 1 ? 'dia' : 'dias'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-lg">📈</span>
            <span>Necessário por dia:</span>
          </div>
          <span className="font-bold text-[#00D4AA] font-tabular">
            {formatCurrency(remainingDaysDetails.dailyNeeded, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
