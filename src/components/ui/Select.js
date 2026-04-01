import { forwardRef } from 'react';
import { FieldShell, getFieldClassName } from './FieldShell';
import { AppIcon } from './Icon';

export const Select = forwardRef(function Select(
  { id, label, error, hint, required, className, inputClassName, children, leadingIcon, ...props },
  ref
) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <div className="relative">
        {leadingIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-app-muted">
            <AppIcon icon={leadingIcon} className="text-sm" />
          </span>
        ) : null}
        <select
          ref={ref}
          id={id}
          className={getFieldClassName(inputClassName, { hasLeadingIcon: Boolean(leadingIcon) })}
          {...props}
        >
          {children}
        </select>
      </div>
    </FieldShell>
  );
});
