import type { CSSProperties } from 'react';

export const toolbarBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 11px',
  fontSize: 12,
  background: 'transparent',
  border: '1px solid var(--border-md)',
  borderRadius: 20,
  cursor: 'pointer',
  color: 'var(--text-3)',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
};

export const popoverItemStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '9px 12px',
  fontSize: 13,
  border: 'none',
  borderRadius: 7,
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--text)',
  fontFamily: 'inherit',
};

export const navLinkStyle = (active: boolean): CSSProperties => ({
  padding: '7px 13px',
  borderRadius: 6,
  fontSize: 14,
  color: active ? 'var(--text)' : 'var(--text-3)',
  background: active ? 'var(--bg-surface)' : 'transparent',
  textDecoration: 'none',
  cursor: 'pointer',
});
