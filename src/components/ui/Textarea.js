import { forwardRef } from 'react';
import { FieldShell, getFieldClassName } from './FieldShell';

export const Textarea = forwardRef(function Textarea(
  { id, label, error, hint, required, className, inputClassName, rows = 5, ...props },
  ref
) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={getFieldClassName(inputClassName)}
        {...props}
      />
    </FieldShell>
  );
});
