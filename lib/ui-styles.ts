import type { CSSProperties } from 'react';

export const toolbarBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 11px',
  fontSize: 12,
  background: 'transparent',
  border: '1px solid #d1d5db',
  borderRadius: 20,
  cursor: 'pointer',
  color: '#6b7280',
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
  color: '#14151a',
  fontFamily: 'inherit',
};

export const navLinkStyle = (active: boolean): CSSProperties => ({
  padding: '7px 13px',
  borderRadius: 6,
  fontSize: 14,
  color: active ? '#14151a' : '#6b7280',
  background: active ? '#f1f1f3' : 'transparent',
  textDecoration: 'none',
  cursor: 'pointer',
});
