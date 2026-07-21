import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'Internal Demo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            background: '#ffffff',
            color: '#14151a',
          }}
        >
          <NavBar />
          {children}
        </div>
      </body>
    </html>
  );
}
