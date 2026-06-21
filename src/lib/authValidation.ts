export function validatePassword(password: string, confirm?: string): string[] {
  const errors: string[] = [];
  if (password.length < 6) errors.push("Password must be at least 6 characters.");
  if (confirm !== undefined && confirm !== password) errors.push("Passwords don't match.");
  return errors;
}

export function validateCredentials(
  email: string,
  password: string,
  confirm?: string,
): string[] {
  const errors: string[] = [];
  if (email.trim() === "") errors.push("Enter your email.");
  errors.push(...validatePassword(password, confirm));
  return errors;
}
