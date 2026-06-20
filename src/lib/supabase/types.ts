export type CategoryKind = "expense" | "income";
export type Direction = "in" | "out";

export interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  monthly_limit: number | null;
  kind: CategoryKind;
  created_at: string;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  direction: Direction;
  note: string | null;
  occurred_at: string;
  created_at: string;
}

export interface EmployerRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ShiftRow {
  id: string;
  user_id: string;
  employer_id: string | null;
  shift_type: string | null;
  clock_in: string;
  clock_out: string;
  pay: number | null;
  note: string | null;
  worked_on: string;
  created_at: string;
}
