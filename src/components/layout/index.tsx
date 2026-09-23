/* ============================================
   SCREEN HEADER — Top navigation bar
   Used across all main screens
   ============================================ */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Home, ClipboardList, BarChart2, CalendarDays } from 'lucide-react';
import { IconButton, ScreenTitle } from '@/components/ui';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  /** Left-aligned Syne ExtraBold display title (root tab screens) */
  variant?: 'centered' | 'display';
  /** Display title size: sm=24 md=26 lg=28 xl=30 */
  titleSize?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  transparent = false,
  variant = 'centered',
  titleSize = 'lg',
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  if (variant === 'display') {
    return (
      <header
        className={`sticky top-0 z-30 pt-[env(safe-area-inset-top)] ${
          transparent ? 'bg-transparent' : 'bg-bg-app/95 backdrop-blur-md'
        }`}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            <ScreenTitle size={titleSize} className="break-words">
              {title}
            </ScreenTitle>
            {subtitle && (
              <p className="text-body text-text-secondary mt-1.5">{subtitle}</p>
            )}
          </div>
          <div className="flex-shrink-0 pt-0.5">{rightAction}</div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={`sticky top-0 z-30 pt-[env(safe-area-inset-top)] ${
        transparent ? 'bg-transparent' : 'bg-bg-app/95 backdrop-blur-md'
      }`}
    >
      <div className="flex items-center justify-between px-5 h-14">
        {/* Left: Back button */}
        <div className="w-11">
          {showBack && (
            <IconButton label="Indietro" onClick={handleBack} className="-ml-1.5">
              <ChevronLeft className="w-6 h-6" strokeWidth={2} />
            </IconButton>
          )}
        </div>

        {/* Center: Title */}
        <div className="flex-1 text-center min-w-0">
          <p className="text-label-sm text-text-secondary tracking-widest uppercase truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-meta text-text-primary">{subtitle}</p>
          )}
        </div>

        {/* Right: Action */}
        <div className="w-11 flex justify-end">{rightAction}</div>
      </div>
    </header>
  );
};

/* ============================================
   BOTTOM NAVIGATION
   ============================================ */

import { Link, useLocation } from 'react-router-dom';

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
        className="flex items-stretch justify-between px-[22px] pt-[10px] pb-[20px]"
        style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}
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
              className="flex-1 flex flex-col items-center justify-center gap-[3px] min-h-[44px] py-1 relative"
            >
              <Icon
                className={`w-5 h-5 transition-colors duration-200 ${
                  isActive ? 'text-accent-primary' : 'text-icon-secondary'
                }`}
                strokeWidth={2}
              />
              <span
                className={`text-[12px] font-semibold leading-none transition-colors duration-200 ${
                  isActive ? 'text-accent-primary' : 'text-text-secondary'
                }`}
              >
                {label}
              </span>
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
