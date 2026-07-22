'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { UserAreaProvider, useUserArea } from './UserAreaContext';
import { ChatSidebar } from '@/app/chat/components/ChatSidebar';
import { navLinkStyle } from '@/lib/ui-styles';

function Shell({ children }: { children: React.ReactNode }) {
  const {
    sessions,
    sessionsLoaded,
    sidebarOpen, setSidebarOpen,
    activeSessionId,
    leadSubmitted, leadName,
    setPendingSession,
  } = useUserArea();
  const router = useRouter();
  const pathname = usePathname();
  const isChat = pathname === '/chat';
  const isProfile = pathname === '/profile';

  // Lead form: full-screen, no sidebar or nav
  if (isChat && leadSubmitted === false) {
    return (
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {children}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        sessions={sessions}
        sessionId={isChat ? activeSessionId : null}
        name={leadName}
        loading={!sessionsLoaded}
        onNewChat={() => {
          setPendingSession('new');
          if (!isChat) router.push('/chat');
        }}
        onSwitchSession={(id) => {
          setPendingSession(id);
          if (!isChat) router.push('/chat');
        }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* Shared top nav — active state derived from pathname */}
        <div style={{
          flexShrink: 0,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 20px',
          borderBottom: '1px solid #e3e3e6',
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <Link href="/chat" style={navLinkStyle(isChat)}>💬 Chat</Link>
            {leadSubmitted === true && (
              <Link href="/profile" style={navLinkStyle(isProfile)}>👤 Profile</Link>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function UserAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserAreaProvider>
      <Shell>{children}</Shell>
    </UserAreaProvider>
  );
}
