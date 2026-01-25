'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCompare } from '@/app/context/CompareContext';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Search, Heart } from 'lucide-react';

export default function Navbar() {
  const [darkMode, setDarkMode] = useState(false);
  const { compareCars } = useCompare();

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-semibold text-xl">
            <span className="text-2xl">🚗</span>
            <span className="text-foreground font-bold">
              RideIQ
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Search
            </Link>
            {compareCars.length > 0 && (
              <Link
                href="/compare"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative"
              >
                Compare
                {compareCars.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {compareCars.length}
                  </span>
                )}
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {compareCars.length > 0 && (
              <Link href="/compare">
                <Button variant="outline" size="sm" className="relative">
                  Compare ({compareCars.length})
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

