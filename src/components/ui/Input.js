import { forwardRef } from 'react';
import { FieldShell, getFieldClassName } from './FieldShell';

export const Input = forwardRef(function Input(
  { id, label, error, hint, required, className, inputClassName, ...props },
  ref
) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <input
        ref={ref}
        id={id}
        className={getFieldClassName(inputClassName)}
        {...props}
      />
    </FieldShell>
  );
});
