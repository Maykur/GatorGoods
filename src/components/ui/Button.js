import { cn } from '../../lib/ui';
import { AppIcon } from './Icon';

const VARIANT_CLASSES = {
  primary:
    'bg-gatorOrange text-white shadow-glow hover:bg-gatorOrange/90 focus-visible:ring-gatorOrange/60',
  secondary:
    'border border-white/10 bg-app-surface/70 text-app-text hover:border-white/20 hover:bg-app-elevated/90',
  ghost:
    'bg-transparent text-app-soft hover:bg-white/5 hover:text-white',
  danger:
    'bg-app-danger/90 text-white hover:bg-app-danger',
};

const SIZE_CLASSES = {
  sm: 'min-h-10 px-4 text-sm',
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-12 px-6 text-base',
};

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export function Button({
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={cn(
        'focus-ring inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary,
        SIZE_CLASSES[size] || SIZE_CLASSES.md,
        fullWidth ? 'w-full' : '',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {!loading && leadingIcon ? <AppIcon icon={leadingIcon} className="text-[0.95em]" /> : null}
      <span>{children}</span>
      {!loading && trailingIcon ? <AppIcon icon={trailingIcon} className="text-[0.95em]" /> : null}
    </button>
  );
}
