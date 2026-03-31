import { forwardRef } from 'react';
import { FieldShell, getFieldClassName } from './FieldShell';
import { AppIcon } from './Icon';

export const Textarea = forwardRef(function Textarea(
  { id, label, error, hint, required, className, inputClassName, rows = 5, leadingIcon, ...props },
  ref
) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <div className="relative">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-0 top-3.5 flex items-center pl-4 text-app-muted">
            <AppIcon icon={leadingIcon} className="text-sm" />
          </span>
        ) : null}
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          className={getFieldClassName(inputClassName, { hasLeadingIcon: Boolean(leadingIcon) })}
          {...props}
        />
      </div>
    </FieldShell>
  );
});
