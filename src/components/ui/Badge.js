import { cn } from '../../lib/ui';
import { AppIcon } from './Icon';

const VARIANT_CLASSES = {
  default: 'border-white/10 bg-white/5 text-app-soft',
  info: 'border-brand-blue/30 bg-brand-blue/15 text-blue-100',
  success: 'border-app-success/30 bg-app-success/15 text-green-100',
  warning: 'border-app-warning/35 bg-app-warning/15 text-yellow-100',
  danger: 'border-app-danger/30 bg-app-danger/15 text-red-100',
  orange: 'border-gatorOrange/30 bg-gatorOrange/15 text-orange-100',
};

const CONDITION_VARIANTS = {
  Perfect: 'success',
  Good: 'info',
  Fair: 'warning',
  Poor: 'danger',
};

export function Badge({
  variant = 'default',
  condition,
  icon,
  className,
  children,
}) {
  const resolvedVariant = condition ? CONDITION_VARIANTS[condition] || variant : variant;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
        VARIANT_CLASSES[resolvedVariant] || VARIANT_CLASSES.default,
        className
      )}
    >
      {icon ? <AppIcon icon={icon} className="mr-1.5 text-[0.9em]" /> : null}
      {children || condition}
    </span>
  );
}
