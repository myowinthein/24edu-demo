import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '24edu',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}" }} />
      </head>
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            background: 'var(--bg)',
            color: 'var(--text)',
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
