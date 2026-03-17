import React from 'react';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '48px', color: '#64748b' }}>
      <div style={{
        width: '32px', height: '32px',
        border: '3px solid #e2e8f0',
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: '14px' }}>{label}</span>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px',
      padding: '12px 16px', color: '#991b1b', fontSize: '14px',
      margin: '16px 0',
    }}>
      <strong>Error:</strong> {message}
    </div>
  );
}
