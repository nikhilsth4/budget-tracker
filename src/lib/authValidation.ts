export function validateCredentials(email: string, password: string): string[] {
  const errors: string[] = [];
  if (email.trim() === "") errors.push("Enter your email.");
  if (password.length < 6) errors.push("Password must be at least 6 characters.");
  return errors;
}
