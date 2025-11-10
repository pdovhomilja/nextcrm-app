/**
 * Button Component
 *
 * Primary interactive element for user actions
 *
 * @example
 * // Primary button
 * <Button variant="primary" size="medium">
 *   Click me
 * </Button>
 *
 * @example
 * // With icon
 * <Button icon={<CheckIcon />}>Confirm</Button>
 */

import React from 'react';
import styles from './Button.module.css';
import { ButtonProps } from './Button.types';

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      disabled = false,
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      onClick,
      className,
      ariaLabel,
      ...props
    },
    ref
  ) => {
    const buttonClasses = [
      styles.button,
      styles[`variant-${variant}`],
      styles[`size-${size}`],
      disabled && styles.disabled,
      loading && styles.loading,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading && onClick) {
        onClick(e);
      }
    };

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-label={ariaLabel}
        aria-busy={loading}
        type="button"
        {...props}
      >
        {loading ? (
          <span className={styles.spinner} aria-label="Loading">
            {/* Spinner will be CSS-animated */}
          </span>
        ) : icon && iconPosition === 'left' ? (
          <>
            <span className={styles.icon}>{icon}</span>
            {children && <span>{children}</span>}
          </>
        ) : icon && iconPosition === 'right' ? (
          <>
            {children && <span>{children}</span>}
            <span className={styles.icon}>{icon}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
