/**
 * Input Component
 *
 * Text input field with optional label, helper text, and error states
 *
 * @example
 * // Basic input
 * <Input placeholder="Enter text..." />
 *
 * @example
 * // With label and error
 * <Input
 *   label="Email"
 *   type="email"
 *   error="Invalid email format"
 *   required
 * />
 *
 * @example
 * // With helper text
 * <Input
 *   label="Password"
 *   type="password"
 *   helperText="Minimum 8 characters"
 * />
 */

import React, { useId } from 'react';
import styles from './Input.module.css';
import { InputProps } from './Input.types';

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      value,
      onChange,
      placeholder,
      disabled = false,
      error,
      success = false,
      loading = false,
      icon,
      label,
      helperText,
      required = false,
      maxLength,
      className,
      ariaLabel,
      ariaDescribedBy: externalAriaDescribedBy,
      dataTestId,
      ...props
    },
    ref
  ) => {
    const id = useId();
    const helperId = `${id}-helper`;
    const errorId = `${id}-error`;

    // Build aria-describedby
    const ariaDescribedBy = [
      helperText && helperId,
      error && errorId,
      externalAriaDescribedBy,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    const inputClasses = [
      styles.input,
      error && styles.error,
      success && styles.success,
      loading && styles.loading,
      disabled && styles.disabled,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const wrapperClasses = [styles.wrapper, disabled && styles.wrapperDisabled]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={id} className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
        )}

        <div className={styles.inputWrapper}>
          {icon && <span className={styles.iconLeft}>{icon}</span>}

          <input
            ref={ref}
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled || loading}
            maxLength={maxLength}
            className={inputClasses}
            aria-label={ariaLabel || label}
            aria-describedby={ariaDescribedBy}
            aria-invalid={!!error}
            aria-disabled={disabled}
            data-testid={dataTestId}
            {...props}
          />

          {loading && (
            <span className={styles.spinner} aria-label="Loading">
              {/* CSS-animated spinner */}
            </span>
          )}

          {error && (
            <span className={styles.errorIcon} aria-hidden="true">
              ✕
            </span>
          )}

          {success && !error && (
            <span className={styles.successIcon} aria-hidden="true">
              ✓
            </span>
          )}
        </div>

        {helperText && !error && (
          <p id={helperId} className={styles.helperText}>
            {helperText}
          </p>
        )}

        {error && typeof error === 'string' && (
          <p id={errorId} className={styles.errorText} role="alert">
            {error}
          </p>
        )}

        {maxLength && !error && (
          <p className={styles.charCount}>
            {typeof value === 'string' ? value.length : 0} / {maxLength}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
