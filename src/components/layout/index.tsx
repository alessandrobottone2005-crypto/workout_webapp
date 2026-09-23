/* ============================================
   SCREEN HEADER — Top navigation bar
   Used across all main screens
   ============================================ */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  transparent = false,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={`sticky top-0 z-30 pt-[env(safe-area-inset-top)] ${
        transparent ? 'bg-transparent' : 'bg-bg-app/95 backdrop-blur-md'
      }`}
    >
      <div className="flex items-center justify-between px-5 h-14">
        {/* Left: Back button */}
        <div className="w-10">
          {showBack && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleBack}
              aria-label="Indietro"
              className="w-11 h-11 flex items-center justify-center -ml-2 text-text-secondary hover:text-text-primary active:text-text-primary"
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
          )}
        </div>

        {/* Center: Title */}
        <div className="flex-1 text-center">
          <p className="text-label-sm text-text-secondary tracking-widest uppercase">
            {title}
          </p>
          {subtitle && (
            <p className="text-meta text-text-primary">{subtitle}</p>
          )}
        </div>

        {/* Right: Action */}
        <div className="w-10 flex justify-end">{rightAction}</div>
      </div>
    </header>
  );
};

/* ============================================
   BOTTOM NAVIGATION
   ============================================ */

import { Link, useLocation } from 'react-router-dom';
import { Home, ClipboardList, BarChart2, CalendarDays } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/program', label: 'Scheda', icon: ClipboardList },
  { to: '/progress', label: 'Progressi', icon: BarChart2 },
  { to: '/calendar', label: 'Calendario', icon: CalendarDays },
] as const;

export const BottomNavigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-bg-surface/95 backdrop-blur-md border-t border-border-default"
      aria-label="Navigazione principale"
    >
      <div
        className="flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const isActive =
            to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to);

          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-1 min-h-[64px] relative"
            >
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-colors duration-200 ${
                    isActive ? 'text-accent-primary' : 'text-text-secondary'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] font-semibold transition-colors duration-200 ${
                  isActive ? 'text-accent-primary' : 'text-text-secondary'
                }`}
              >
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-accent-primary rounded-full"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

/* ============================================
    APP SHELL — Full screen wrapper
    ============================================ */

import { RestTimerLayer } from '@/features/timer/TimerComponents';

interface AppShellProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  showNav = true,
}) => (
  <div className="min-h-[100dvh] bg-bg-app flex flex-col max-w-[480px] mx-auto relative">
    <main className="flex-1 flex flex-col">{children}</main>
    {showNav && <BottomNavigation />}
    {/* Persistent rest-timer pill + focused view, visible from any screen */}
    <RestTimerLayer hasNav={showNav} />
  </div>
);
