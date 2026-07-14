import React from 'react';

const Logo = ({ size = 'md', showSubtitle = false, className = '' }) => {
  const sizes = {
    sm: {
      iconSize: 24,
      fontSize: '1.2rem',
      gap: '0.45rem',
      badgeSize: '0.65rem'
    },
    md: {
      iconSize: 30,
      fontSize: '1.45rem',
      gap: '0.55rem',
      badgeSize: '0.7rem'
    },
    lg: {
      iconSize: 38,
      fontSize: '1.8rem',
      gap: '0.65rem',
      badgeSize: '0.75rem'
    },
    xl: {
      iconSize: 46,
      fontSize: '2.2rem',
      gap: '0.75rem',
      badgeSize: '0.8rem'
    }
  };

  const config = sizes[size] || sizes.md;

  return (
    <div 
      className={`cobuy-logo-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: showSubtitle ? 'center' : 'flex-start',
        userSelect: 'none'
      }}
    >
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: config.gap,
          cursor: 'pointer'
        }}
      >
        {/* SVG CoBuy Mark: Interlocking Association Nodes & Shopping Analytics Symbol */}
        <div 
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: 'drop-shadow(0 4px 10px rgba(99, 102, 241, 0.35))',
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          className="cobuy-logo-icon"
        >
          <svg
            width={config.iconSize}
            height={config.iconSize}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="cobuyMainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="55%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <linearGradient id="cobuyAccentGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>

            {/* Background Hex / Rounded Plate */}
            <rect
              x="12"
              y="12"
              width="76"
              height="76"
              rx="22"
              fill="url(#cobuyMainGrad)"
              fillOpacity="0.18"
              stroke="url(#cobuyMainGrad)"
              strokeWidth="3.5"
            />

            {/* Left Association Node */}
            <circle
              cx="36"
              cy="50"
              r="13"
              fill="url(#cobuyMainGrad)"
            />

            {/* Right Association Node */}
            <circle
              cx="64"
              cy="50"
              r="13"
              fill="url(#cobuyAccentGrad)"
            />

            {/* Interlocking Bridge */}
            <path
              d="M 36 43 C 48 30, 52 30, 64 43 M 36 57 C 48 70, 52 70, 64 57"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.95"
            />

            {/* Center Dynamic Pulse Node */}
            <circle
              cx="50"
              cy="50"
              r="6.5"
              fill="#ffffff"
            />
          </svg>
        </div>

        {/* Typography */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              fontWeight: '800',
              fontSize: config.fontSize,
              color: '#ffffff',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              fontFamily: 'Outfit, Inter, system-ui, sans-serif'
            }}
          >
            co
          </span>
          <span
            style={{
              fontWeight: '800',
              fontSize: config.fontSize,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #10b981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              fontFamily: 'Outfit, Inter, system-ui, sans-serif'
            }}
          >
            buy
          </span>
        </div>
      </div>

      {showSubtitle && (
        <span 
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontWeight: '600',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: '0.45rem'
          }}
        >
          Association Rule Mining
        </span>
      )}
    </div>
  );
};

export default Logo;
