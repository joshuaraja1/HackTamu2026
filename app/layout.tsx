import type { Metadata } from 'next';
import './globals.css';
import { CompareProvider } from './context/CompareContext';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'RideIQ - AI-Powered Car Recommendations',
  description: 'Find your perfect car with AI-powered recommendations. Search, compare, and discover the best deals.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <CompareProvider>
          {children}
          <Toaster />
        </CompareProvider>
      </body>
    </html>
  );
}

