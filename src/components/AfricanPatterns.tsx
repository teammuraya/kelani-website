import { useParallax } from '../hooks/useScrollAnimation';

export function AfricanDividerLight() {
  const offset = useParallax();

  return (
    <div className="relative overflow-hidden h-24 md:h-32 bg-white">
      <svg
        className="absolute inset-0 w-[200%] h-full"
        style={{ transform: `translateX(${-offset * 0.08}px)` }}
        viewBox="0 0 2400 120"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M0,60 C100,20 200,100 300,60 C400,20 500,100 600,60 C700,20 800,100 900,60 C1000,20 1100,100 1200,60 C1300,20 1400,100 1500,60 C1600,20 1700,100 1800,60 C1900,20 2000,100 2100,60 C2200,20 2300,100 2400,60"
          stroke="rgba(73,96,75,0.12)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M0,50 C80,80 160,20 240,50 C320,80 400,20 480,50 C560,80 640,20 720,50 C800,80 880,20 960,50 C1040,80 1120,20 1200,50 C1280,80 1360,20 1440,50 C1520,80 1600,20 1680,50 C1760,80 1840,20 1920,50 C2000,80 2080,20 2160,50 C2240,80 2320,20 2400,50"
          stroke="rgba(73,96,75,0.08)"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M0,70 C120,30 240,110 360,70 C480,30 600,110 720,70 C840,30 960,110 1080,70 C1200,30 1320,110 1440,70 C1560,30 1680,110 1800,70 C1920,30 2040,110 2160,70 C2280,30 2400,110 2400,70"
          stroke="rgba(73,96,75,0.06)"
          strokeWidth="1"
          fill="none"
        />
        {Array.from({ length: 16 }).map((_, i) => (
          <g key={i} transform={`translate(${i * 150}, 0)`}>
            <path
              d="M75,30 Q90,45 75,60 Q60,75 75,90"
              stroke="rgba(73,96,75,0.07)"
              strokeWidth="1"
              fill="none"
            />
            <circle
              cx={75}
              cy={60}
              r="3"
              fill="none"
              stroke="rgba(73,96,75,0.1)"
              strokeWidth="0.8"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function AfricanDividerDark() {
  const offset = useParallax();

  return (
    <div className="relative overflow-hidden h-24 md:h-32 bg-charcoal-900">
      <svg
        className="absolute inset-0 w-[200%] h-full"
        style={{ transform: `translateX(${offset * 0.06}px)` }}
        viewBox="0 0 2400 120"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M0,60 C150,10 300,110 450,60 C600,10 750,110 900,60 C1050,10 1200,110 1350,60 C1500,10 1650,110 1800,60 C1950,10 2100,110 2250,60 C2400,10 2400,60 2400,60"
          stroke="rgba(73,96,75,0.25)"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M0,40 C100,70 200,10 300,40 C400,70 500,10 600,40 C700,70 800,10 900,40 C1000,70 1100,10 1200,40 C1300,70 1400,10 1500,40 C1600,70 1700,10 1800,40 C1900,70 2000,10 2100,40 C2200,70 2300,10 2400,40"
          stroke="rgba(73,96,75,0.15)"
          strokeWidth="1"
          fill="none"
        />
        <path
          d="M0,80 C80,50 160,100 240,80 C320,50 400,100 480,80 C560,50 640,100 720,80 C800,50 880,100 960,80 C1040,50 1120,100 1200,80 C1280,50 1360,100 1440,80 C1520,50 1600,100 1680,80 C1760,50 1840,100 1920,80 C2000,50 2080,100 2160,80 C2240,50 2320,100 2400,80"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
          fill="none"
        />
        {Array.from({ length: 12 }).map((_, i) => (
          <g key={i} transform={`translate(${i * 200}, 0)`}>
            <path
              d="M100,25 C110,35 100,50 90,40 C80,50 90,65 100,55 C110,65 100,80 90,70"
              stroke="rgba(73,96,75,0.2)"
              strokeWidth="1"
              fill="none"
            />
            <diamond>
              <rect
                x="96"
                y="45"
                width="8"
                height="8"
                rx="1"
                transform="rotate(45, 100, 49)"
                fill="none"
                stroke="rgba(73,96,75,0.15)"
                strokeWidth="0.8"
              />
            </diamond>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function AfricanSectionOverlay({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const offset = useParallax();
  const color = variant === 'light' ? 'rgba(73,96,75,0.04)' : 'rgba(73,96,75,0.1)';
  const accentColor = variant === 'light' ? 'rgba(73,96,75,0.06)' : 'rgba(73,96,75,0.15)';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute top-0 right-0 w-[600px] h-[600px] opacity-60"
        style={{ transform: `translateY(${offset * 0.03}px)` }}
        viewBox="0 0 600 600"
        fill="none"
      >
        <circle cx="300" cy="300" r="200" stroke={color} strokeWidth="1" />
        <circle cx="300" cy="300" r="250" stroke={color} strokeWidth="0.5" />
        <circle cx="300" cy="300" r="150" stroke={accentColor} strokeWidth="0.8" />
        <path
          d="M300,100 Q400,200 300,300 Q200,400 300,500"
          stroke={accentColor}
          strokeWidth="1"
          fill="none"
        />
        <path
          d="M100,300 Q200,200 300,300 Q400,400 500,300"
          stroke={accentColor}
          strokeWidth="1"
          fill="none"
        />
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 45 * Math.PI) / 180;
          const x1 = 300 + 120 * Math.cos(angle);
          const y1 = 300 + 120 * Math.sin(angle);
          const x2 = 300 + 180 * Math.cos(angle);
          const y2 = 300 + 180 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth="0.8"
            />
          );
        })}
      </svg>

      <svg
        className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-40"
        style={{ transform: `translateY(${-offset * 0.02}px)` }}
        viewBox="0 0 400 400"
        fill="none"
      >
        <path
          d="M0,200 C50,150 100,250 150,200 C200,150 250,250 300,200 C350,150 400,250 400,200"
          stroke={accentColor}
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M0,180 C50,230 100,130 150,180 C200,230 250,130 300,180 C350,230 400,130 400,180"
          stroke={color}
          strokeWidth="1"
          fill="none"
        />
        {Array.from({ length: 6 }).map((_, i) => (
          <g key={i} transform={`translate(${i * 70 + 20}, ${180 + (i % 2) * 40})`}>
            <path
              d="M0,0 Q10,-15 20,0 Q10,15 0,0"
              stroke={accentColor}
              strokeWidth="0.8"
              fill="none"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function ScrollingAfricanBand({ direction = 'left' }: { direction?: 'left' | 'right' }) {
  const offset = useParallax();
  const translateX = direction === 'left' ? -offset * 0.1 : offset * 0.1;

  return (
    <div className="relative overflow-hidden h-16 flex items-center">
      <svg
        className="absolute h-full w-[300%]"
        style={{ transform: `translateX(${translateX}px)` }}
        viewBox="0 0 3600 60"
        fill="none"
        preserveAspectRatio="none"
      >
        {Array.from({ length: 60 }).map((_, i) => {
          const x = i * 60;
          return (
            <g key={i}>
              <path
                d={`M${x},30 Q${x + 15},10 ${x + 30},30 Q${x + 15},50 ${x},30`}
                stroke="rgba(73,96,75,0.12)"
                strokeWidth="0.8"
                fill="none"
              />
              <circle
                cx={x + 30}
                cy={30}
                r="2"
                fill="rgba(73,96,75,0.08)"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
