import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/layout/Navigation';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'DeltaNeutral — Options Trading Dashboard',
  description:
    'Delta-neutral options trading on Deribit with paper and live trading modes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <Navigation />
          <main
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              padding: '24px',
              minHeight: 'calc(100vh - 60px)',
            }}
          >
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
