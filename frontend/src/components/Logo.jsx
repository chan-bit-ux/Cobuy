import React from 'react';

const Logo = ({ size = 'md', showSubtitle = false, className = '' }) => {
  const sizes = {
    sm: {
      fontSize: '1.18rem',
      iconSize: '24px',
      badgeFontSize: '0.72rem'
    },
    md: {
      fontSize: '1.45rem',
      iconSize: '32px',
      badgeFontSize: '0.92rem'
    },
    lg: {
      fontSize: '1.8rem',
      iconSize: '40px',
      badgeFontSize: '1.15rem'
    },
    xl: {
      fontSize: '2.2rem',
      iconSize: '48px',
      badgeFontSize: '1.4rem'
    }
  };

  const config = sizes[size] || sizes.md;

  return (
    <div 
      className={`cobuy-logo-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        width: '100%'
      }}
    >
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: size === 'sm' ? '0.55rem' : '0.68rem',
          cursor: 'pointer'
        }}
      >
        {/* CoBuy Brand Wordmark */}
        <span
          style={{
            fontWeight: '800',
            fontSize: config.fontSize,
            color: 'var(--text-main)',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            fontFamily: 'Outfit, Inter, system-ui, sans-serif'
          }}
        >
          CoBuy
        </span>
      </div>

      {showSubtitle && (
        <span 
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontWeight: '600',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: '0.45rem',
            textAlign: 'center'
          }}
        >
          Buying Pattern Mining
        </span>
      )}
    </div>
  );
};

export default Logo;
