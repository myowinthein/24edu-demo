'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const isChat = pathname.startsWith('/chat');
  const isSources = pathname.startsWith('/sources');

  if (isAdmin || isChat) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: 56,
        flexShrink: 0,
        padding: '0 20px',
        borderBottom: '1px solid #e3e3e6',
      }}
    >
      <div style={{ display: 'flex', gap: 4 }}>
        <Link
          href="/chat"
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            fontSize: 14,
            cursor: 'pointer',
            color: isChat ? '#14151a' : '#6b7280',
            background: isChat ? '#f1f1f3' : 'transparent',
            textDecoration: 'none',
          }}
        >
          💬 Chat
        </Link>
        <Link
          href="/sources"
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            fontSize: 14,
            cursor: 'pointer',
            color: isSources ? '#14151a' : '#6b7280',
            background: isSources ? '#f1f1f3' : 'transparent',
            textDecoration: 'none',
          }}
        >
          📂 Sources
        </Link>
      </div>
    </div>
  );
}
