import type { Metadata } from 'next';
import './globals.css';

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
          {children}
        </div>
      </body>
    </html>
  );
}
