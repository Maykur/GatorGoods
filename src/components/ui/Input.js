import { forwardRef } from 'react';
import { FieldShell, getFieldClassName } from './FieldShell';
import { AppIcon } from './Icon';

export const Input = forwardRef(function Input(
  { id, label, error, hint, required, className, inputClassName, leadingIcon, ...props },
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
        <input
          ref={ref}
          id={id}
          className={getFieldClassName(inputClassName, { hasLeadingIcon: Boolean(leadingIcon) })}
          {...props}
        />
      </div>
    </FieldShell>
  );
});
