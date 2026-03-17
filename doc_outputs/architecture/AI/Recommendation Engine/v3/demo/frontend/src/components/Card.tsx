import React from 'react';

interface CardProps {
  title?: string;
  titleRight?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  noPad?: boolean;
}

export function Card({ title, titleRight, children, style, noPad }: CardProps) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      overflow: 'hidden',
      ...style,
    }}>
      {title && (
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
        }}>
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{title}</span>
          {titleRight}
        </div>
      )}
      <div style={noPad ? undefined : { padding: '16px' }}>
        {children}
      </div>
    </div>
  );
}
