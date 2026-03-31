import { forwardRef } from 'react';
import { FieldShell, getFieldClassName } from './FieldShell';

export const Select = forwardRef(function Select(
  { id, label, error, hint, required, className, inputClassName, children, ...props },
  ref
) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <select
        ref={ref}
        id={id}
        className={getFieldClassName(inputClassName)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
});
