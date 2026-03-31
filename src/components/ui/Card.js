import { cn } from '../../lib/ui';

const VARIANT_CLASSES = {
  default: 'surface-card',
  interactive: 'surface-card-interactive',
  subtle: 'rounded-[1.5rem] border border-white/8 bg-app-surface/55 backdrop-blur-sm',
};

const PADDING_CLASSES = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6 sm:p-7',
};

export function Card({
  as: Component = 'div',
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...props
}) {
  return (
    <Component
      className={cn(
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.default,
        PADDING_CLASSES[padding] || PADDING_CLASSES.md,
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
