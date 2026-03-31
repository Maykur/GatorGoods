import { cn } from '../../lib/ui';

export function getFieldClassName(className, { hasLeadingIcon = false } = {}) {
  return cn(
    'focus-ring block w-full rounded-2xl border border-app-border/80 bg-app-surface/80 px-4 py-3 text-sm text-app-text placeholder:text-app-muted',
    'transition-colors duration-200 hover:border-white/15',
    'focus:border-gatorOrange focus:ring-focus',
    hasLeadingIcon ? 'pl-11' : '',
    className
  );
}

export function FieldShell({
  id,
  label,
  error,
  hint,
  required = false,
  className,
  children,
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <label htmlFor={id} className="block text-sm font-semibold text-app-text">
          <span>{label}</span>
          {required ? <span className="ml-1 text-gatorOrange">*</span> : null}
        </label>
      ) : null}
      {children}
      {hint && !error ? <p className="text-sm text-app-muted">{hint}</p> : null}
      {error ? <p className="text-sm font-medium text-app-danger">{error}</p> : null}
    </div>
  );
}
