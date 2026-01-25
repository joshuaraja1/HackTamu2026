import type { Metadata } from 'next';
import './globals.css';
import { CompareProvider } from './context/CompareContext';

export const metadata: Metadata = {
  title: 'Toyota Car Marketplace',
  description: 'E-commerce recommendation engine for car marketplace',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CompareProvider>
          {children}
        </CompareProvider>
      </body>
    </html>
  );
}

