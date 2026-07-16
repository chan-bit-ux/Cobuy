import React from 'react';

const Logo = ({ size = 'md', showSubtitle = false, className = '' }) => {
  const sizes = {
    sm: {
      fontSize: '1.2rem'
    },
    md: {
      fontSize: '1.45rem'
    },
    lg: {
      fontSize: '1.8rem'
    },
    xl: {
      fontSize: '2.2rem'
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
          cursor: 'pointer'
        }}
      >
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
          cobuy
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
