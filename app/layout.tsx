import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Project Registration Portal',
  description: 'A simple, stress-free portal for students to register their mini projects.',
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#faf8f5] text-stone-800 antialiased font-['Plus_Jakarta_Sans',sans-serif]">
        {children}
      </body>
    </html>
  );
}
