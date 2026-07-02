const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface PasswordRule {
  label: string;
  passed: boolean;
}

export function validateEmail(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, error: 'Email is required' };
  if (!EMAIL_REGEX.test(trimmed)) return { valid: false, error: 'Enter a valid email address' };
  return { valid: true };
}

export function validatePhone(value: string): ValidationResult {
  const digits = value.replace(/\D/g, '');
  if (!digits) return { valid: false, error: 'Phone number is required' };
  if (digits.startsWith('234') && digits.length === 13) return { valid: true };
  if (digits.startsWith('0') && digits.length === 11) return { valid: true };
  if (digits.length === 10) return { valid: true };
  return { valid: false, error: 'Enter a valid Nigerian phone number (10 digits)' };
}

export function validateBVN(value: string): ValidationResult {
  const digits = value.replace(/\D/g, '');
  if (!digits) return { valid: false, error: 'BVN is required' };
  if (digits.length !== 11) return { valid: false, error: 'BVN must be exactly 11 digits' };
  return { valid: true };
}

export function validateNIN(value: string): ValidationResult {
  const digits = value.replace(/\D/g, '');
  if (!digits) return { valid: false, error: 'NIN is required' };
  if (digits.length !== 11) return { valid: false, error: 'NIN must be exactly 11 digits' };
  return { valid: true };
}

export function validatePassword(value: string): { valid: boolean; rules: PasswordRule[] } {
  const rules: PasswordRule[] = [
    { label: 'Minimum 8 characters', passed: value.length >= 8 },
    { label: 'At least one uppercase letter', passed: /[A-Z]/.test(value) },
    { label: 'At least one number', passed: /\d/.test(value) },
    { label: 'At least one special character', passed: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(value) },
  ];
  return { valid: rules.every((r) => r.passed), rules };
}

export function validateDOB(value: string): ValidationResult {
  if (!value || value.length < 10) return { valid: false, error: 'Date of birth is required' };

  const parts = value.split('/');
  if (parts.length !== 3) return { valid: false, error: 'Use DD/MM/YYYY format' };

  const [d, m, y] = parts;
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  const year = parseInt(y, 10);

  if (!day || !month || !year) return { valid: false, error: 'Use DD/MM/YYYY format' };
  if (month < 1 || month > 12) return { valid: false, error: 'Invalid month' };
  if (day < 1 || day > 31) return { valid: false, error: 'Invalid day' };
  if (year < 1900 || year > new Date().getFullYear()) return { valid: false, error: 'Invalid year' };

  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 18) return { valid: false, error: 'You must be 18 or older' };
  return { valid: true };
}

export function validateTIN(value: string): ValidationResult {
  if (!value) return { valid: true }; // TIN is optional
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return { valid: false, error: 'TIN must be 8 digits' };
  return { valid: true };
}

export function validateCACNumber(value: string): ValidationResult {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return { valid: false, error: 'CAC number is required' };
  if (!trimmed.startsWith('RC')) return { valid: false, error: 'CAC number must start with RC' };
  const digits = trimmed.slice(2).replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 7) return { valid: false, error: 'CAC number must be RC followed by 6-7 digits' };
  return { valid: true };
}

export function validateName(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, error: 'Name is required' };
  if (trimmed.length < 2) return { valid: false, error: 'Name must be at least 2 characters' };
  if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) return { valid: false, error: 'Name can only contain letters, spaces, and hyphens' };
  return { valid: true };
}

export function validateAccountNumber(value: string): ValidationResult {
  const digits = value.replace(/\D/g, '');
  if (!digits) return { valid: false, error: 'Account number is required' };
  if (digits.length !== 10) return { valid: false, error: 'Account number must be 10 digits (NUBAN)' };
  return { valid: true };
}

export function validateDriverLicence(value: string): ValidationResult {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return { valid: false, error: 'Driver licence number is required' };
  if (trimmed.length < 9) return { valid: false, error: 'Enter a valid licence number (state code + 7 digits)' };
  const stateCode = trimmed.slice(0, 2);
  const digits = trimmed.slice(2).replace(/\D/g, '');
  if (!/^[A-Z]{2}$/.test(stateCode)) return { valid: false, error: 'Must start with 2-letter state code' };
  if (digits.length < 7) return { valid: false, error: 'Must have at least 7 digits after state code' };
  return { valid: true };
}

export function formatDOBInput(text: string): string {
  const digits = text.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

export function formatPhoneInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara',
] as const;

export const NIGERIAN_BANKS = [
  'Access Bank', 'Citibank', 'Ecobank', 'Fidelity Bank', 'First Bank of Nigeria',
  'First City Monument Bank (FCMB)', 'Globus Bank', 'Guaranty Trust Bank (GTBank)',
  'Heritage Bank', 'Jaiz Bank', 'Keystone Bank', 'Kuda Bank', 'Opay',
  'Palmpay', 'Parallex Bank', 'Polaris Bank', 'Providus Bank',
  'Stanbic IBTC Bank', 'Standard Chartered Bank', 'Sterling Bank',
  'SunTrust Bank', 'Titan Trust Bank', 'Union Bank of Nigeria',
  'United Bank for Africa (UBA)', 'Unity Bank', 'VFD Microfinance Bank',
  'Wema Bank', 'Zenith Bank',
] as const;
