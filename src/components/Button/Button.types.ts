/**
 * Button Component Props
 *
 * All possible props for the Button component
 */

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual variant/style of the button
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'tertiary';

  /**
   * Button size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large' | 'extraLarge';

  /**
   * Whether the button is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether button is in loading state
   * @default false
   */
  loading?: boolean;

  /**
   * Icon element to display
   * Can be React component or SVG element
   */
  icon?: React.ReactNode;

  /**
   * Position of icon relative to text
   * @default 'left'
   */
  iconPosition?: 'left' | 'right';

  /**
   * Button content/label
   */
  children?: React.ReactNode;

  /**
   * Callback when button is clicked
   */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Accessibility label for icon-only buttons
   */
  ariaLabel?: string;

  /**
   * Test ID for testing
   */
  dataTestId?: string;

  /**
   * Whether button takes full width
   * @default false
   */
  fullWidth?: boolean;

  /**
   * Button type attribute
   * @default 'button'
   */
  type?: 'button' | 'submit' | 'reset';
}
