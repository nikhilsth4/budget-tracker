export function validateTransaction(input: {
  amount: string;
  categoryId: string | null;
}): string[] {
  const errors: string[] = [];
  const n = Number(input.amount);
  if (input.amount.trim() === "" || Number.isNaN(n)) errors.push("Enter a valid amount");
  else if (n <= 0) errors.push("Amount must be greater than zero");
  if (!input.categoryId) errors.push("Pick a category");
  return errors;
}

export function validateShift(input: {
  employerId: string | null;
  clockIn: string;
  clockOut: string;
}): string[] {
  const errors: string[] = [];
  if (!input.employerId) errors.push("Pick where you worked");
  if (new Date(input.clockOut).getTime() <= new Date(input.clockIn).getTime())
    errors.push("Clock-out must be after clock-in");
  return errors;
}
