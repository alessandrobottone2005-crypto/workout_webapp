/* ============================================
   UI COMPONENTS — Reusable primitives
   All design-system compliant
   ============================================ */

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import logoUrl from '@/assets/brand/workout-lab-logo.svg';

/* ============================================
   APP LOGO — Brand LogoDef (Figma 156×47)
   ============================================ */

interface AppLogoProps {
  width?: number;
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  width = 156,
  className = '',
}) => (
  <img
    src={logoUrl}
    alt="Workout Lab"
    width={width}
    height={Math.round(width * (46.886 / 156))}
    className={`block ${className}`}
    draggable={false}
  />
);

/* ============================================
   SCREEN TITLE — Syne ExtraBold display title
   ============================================ */

type ScreenTitleSize = 'sm' | 'md' | 'lg' | 'xl';

interface ScreenTitleProps {
  children: React.ReactNode;
  size?: ScreenTitleSize;
  className?: string;
  as?: 'h1' | 'h2';
}

const titleSizes: Record<ScreenTitleSize, string> = {
  sm: 'text-[24px]',
  md: 'text-[26px]',
  lg: 'text-[28px]',
  xl: 'text-[30px]',
};

export const ScreenTitle: React.FC<ScreenTitleProps> = ({
  children,
  size = 'lg',
  className = '',
  as: Tag = 'h1',
}) => (
  <Tag className={`screen-title ${titleSizes[size]} ${className}`}>
    {children}
  </Tag>
);

/* ============================================
   ICON BUTTON — 44×44 hit target, 24px icon
   ============================================ */

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: React.ReactNode;
  tone?: 'default' | 'accent' | 'danger';
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  children,
  tone = 'default',
  className = '',
  ...props
}) => {
  const tones = {
    default: 'text-icon-secondary hover:text-icon-primary active:text-icon-primary',
    accent: 'text-icon-accent hover:brightness-110',
    danger: 'text-danger hover:opacity-80',
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`w-11 h-11 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-full ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

/* ============================================
   BUTTON COMPONENTS
   ============================================ */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'default',
  isLoading = false,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-btn transition-all duration-200 select-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary disabled:opacity-40 disabled:pointer-events-none';

  const variants = {
    primary:
      'bg-accent-primary text-bg-app hover:brightness-110',
    secondary:
      'bg-bg-elevated text-text-primary border border-border-default hover:bg-white/5',
    danger:
      'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20',
    ghost:
      'text-text-secondary hover:text-text-primary hover:bg-white/5',
  };

  const sizes = {
    default: 'h-[56px] px-6 text-[15px] tracking-wide',
    sm: 'h-[44px] px-4 text-[14px]',
    lg: 'h-[64px] px-8 text-[16px]',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      onClick={props.onClick}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      type={props.type ?? 'button'}
      aria-label={props['aria-label']}
      aria-pressed={props['aria-pressed']}
      id={props.id}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
      ) : null}
      {children}
    </motion.button>
  );
};

/* ============================================
   PROGRESS BAR
   ============================================ */

interface ProgressBarProps {
  value: number; // 0–1
  className?: string;
  accentColor?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  className = '',
  accentColor = true,
}) => {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={`h-[3px] bg-bg-elevated rounded-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={`h-full rounded-full ${accentColor ? 'bg-accent-primary' : 'bg-text-secondary'}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </div>
  );
};

/* ============================================
   METRIC CARD
   ============================================ */

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, sub }) => (
  <div className="bg-bg-surface rounded-card border border-border-default p-5">
    <p className="text-label-sm text-text-secondary mb-1">{label}</p>
    <p className="text-[28px] font-bold text-text-primary leading-none">{value}</p>
    {sub && <p className="text-meta text-text-secondary mt-1">{sub}</p>}
  </div>
);

/* ============================================
   SECTION HEADER
   ============================================ */

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action }) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-label-sm text-text-secondary">{title}</h2>
    {action}
  </div>
);

/* ============================================
   DIVIDER
   ============================================ */

export const Divider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`h-px bg-border-default ${className}`} />
);

/* ============================================
   NUMERIC STEPPER
   ============================================ */

interface NumericStepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export const NumericStepper: React.FC<NumericStepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
}) => {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <p className="text-label-sm text-text-secondary">{label}</p>
      )}
      <div className="flex items-center gap-6">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={dec}
          disabled={value <= min}
          aria-label={`Riduci ${label ?? 'valore'}`}
          className="w-14 h-14 rounded-full bg-bg-elevated border border-border-default text-text-primary text-2xl font-light flex items-center justify-center disabled:opacity-30 active:bg-white/10"
        >
          −
        </motion.button>
        <span className="text-[52px] font-bold text-text-primary w-20 text-center tabular-nums">
          {value}
        </span>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={inc}
          disabled={value >= max}
          aria-label={`Aumenta ${label ?? 'valore'}`}
          className="w-14 h-14 rounded-full bg-bg-elevated border border-border-default text-text-primary text-2xl font-light flex items-center justify-center disabled:opacity-30 active:bg-white/10"
        >
          +
        </motion.button>
      </div>
    </div>
  );
};

/* ============================================
   EMPTY STATE
   ============================================ */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    {icon && (
      <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center mb-4 text-text-secondary">
        {icon}
      </div>
    )}
    <p className="text-heading text-text-primary mb-2">{title}</p>
    {description && (
      <p className="text-body text-text-secondary max-w-[280px]">{description}</p>
    )}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

/* ============================================
   CONFIRMATION DIALOG
   ============================================ */

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  onConfirm,
  onCancel,
  isDanger = false,
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-[480px] bg-bg-elevated rounded-t-modal border-t border-border-default p-6 pb-[calc(24px+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-heading text-text-primary mb-2">{title}</h3>
        <p className="text-body text-text-secondary mb-6">{description}</p>
        <div className="flex flex-col gap-3">
          <Button
            variant={isDanger ? 'danger' : 'primary'}
            fullWidth
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button variant="ghost" fullWidth onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ============================================
   BADGE
   ============================================ */

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'danger' | 'warning';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-bg-elevated text-text-secondary border-border-default',
    accent: 'bg-accent-primary/10 text-accent-primary border-accent-primary/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-pill border text-label-sm ${variants[variant]}`}
    >
      {children}
    </span>
  );
};

/* ============================================
   LOADING SPINNER
   ============================================ */

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({
  size = 'md',
}) => {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex items-center justify-center">
      <Loader2 className={`${sizes[size]} animate-spin text-text-secondary`} />
    </div>
  );
};

/* ============================================
   TOGGLE SWITCH
   ============================================ */

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  disabled,
}) => (
  <div className="flex items-center justify-between gap-4">
    {label && <span className="text-body text-text-primary">{label}</span>}
    <motion.button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-pill transition-colors duration-200 flex items-center px-0.5 after:absolute after:-inset-y-2 after:-inset-x-1 after:content-[''] ${
        checked ? 'bg-accent-primary' : 'bg-bg-elevated border border-border-default'
      } disabled:opacity-40`}
    >
      <motion.div
        animate={{ x: checked ? 20 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={`w-6 h-6 rounded-full shadow-sm ${
          checked ? 'bg-bg-app' : 'bg-text-secondary'
        }`}
      />
    </motion.button>
  </div>
);
