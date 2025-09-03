// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements:
// - At least 8 characters
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one number
// - At least one special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;

// Phone number validation (supports international numbers)
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isValidPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

export function validateUserInput(input: {
  email?: string;
  password?: string;
  phone?: string;
  name?: string;
}) {
  const errors: Record<string, string> = {};

  if (input.email && !isValidEmail(input.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (input.password && !isValidPassword(input.password)) {
    errors.password =
      'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character';
  }

  if (input.phone && !isValidPhone(input.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  if (input.name && input.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters long';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
