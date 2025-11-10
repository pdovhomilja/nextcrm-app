/**
 * Input Component Props
 */

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * Input type
   * @default 'text'
   */
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'tel'
    | 'url'
    | 'search'
    | 'date'
    | 'time'
    | 'datetime-local';

  /**
   * Whether the input is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Error state - string is error message
   * @default false
   */
  error?: boolean | string;

  /**
   * Success state
   * @default false
   */
  success?: boolean;

  /**
   * Loading state
   * @default false
   */
  loading?: boolean;

  /**
   * Icon element to display on left
   */
  icon?: React.ReactNode;

  /**
   * Label for the input
   */
  label?: string;

  /**
   * Helper text displayed below input
   */
  helperText?: string;

  /**
   * Whether field is required
   * @default false
   */
  required?: boolean;

  /**
   * Maximum character length
   */
  maxLength?: number;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Accessibility label
   */
  ariaLabel?: string;

  /**
   * Additional aria-describedby IDs
   */
  ariaDescribedBy?: string;

  /**
   * Test ID for testing
   */
  dataTestId?: string;

  /**
   * Value change handler
   */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;

  /**
   * Blur handler
   */
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;

  /**
   * Focus handler
   */
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}
