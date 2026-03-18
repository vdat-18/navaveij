import React from 'react';
import type { PriorityLevel } from '../types';

const PRIORITY_STYLES: Record<PriorityLevel, { bg: string; text: string; label: string }> = {
  Red:    { bg: '#fee2e2', text: '#991b1b', label: 'CRITICAL' },
  Orange: { bg: '#ffedd5', text: '#9a3412', label: 'URGENT' },
  Yellow: { bg: '#fef9c3', text: '#854d0e', label: 'RECOMMENDED' },
  Green:  { bg: '#dcfce7', text: '#166534', label: 'CONSIDER' },
};

interface BadgeProps {
  priority: PriorityLevel;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ priority, size = 'md' }: BadgeProps) {
  const s = PRIORITY_STYLES[priority];
  const pad = size === 'sm' ? '2px 6px' : '3px 10px';
  const fontSize = size === 'sm' ? '10px' : '11px';
  return (
    <span style={{
      backgroundColor: s.bg, color: s.text,
      padding: pad, borderRadius: '4px',
      fontSize, fontWeight: 700, letterSpacing: '0.05em',
      display: 'inline-block',
    }}>
      {s.label}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: string;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const map: Record<string, { bg: string; text: string }> = {
    Critical: { bg: '#fee2e2', text: '#991b1b' },
    High:     { bg: '#ffedd5', text: '#9a3412' },
    Medium:   { bg: '#fef9c3', text: '#854d0e' },
    Low:      { bg: '#dcfce7', text: '#166534' },
  };
  const s = map[severity] ?? { bg: '#f1f5f9', text: '#475569' };
  return (
    <span style={{
      backgroundColor: s.bg, color: s.text,
      padding: '2px 8px', borderRadius: '4px',
      fontSize: '11px', fontWeight: 700,
    }}>
      {severity}
    </span>
  );
}

interface TierBadgeProps {
  tier: string;
}

export function TierBadge({ tier }: TierBadgeProps) {
  const map: Record<string, { bg: string; text: string }> = {
    Premium:  { bg: '#fdf4ff', text: '#7e22ce' },
    Advanced: { bg: '#eff6ff', text: '#1d4ed8' },
    Standard: { bg: '#f0fdf4', text: '#15803d' },
  };
  const s = map[tier] ?? { bg: '#f1f5f9', text: '#475569' };
  return (
    <span style={{
      backgroundColor: s.bg, color: s.text, border: `1px solid ${s.text}30`,
      padding: '3px 12px', borderRadius: '20px',
      fontSize: '13px', fontWeight: 700,
    }}>
      {tier}
    </span>
  );
}
