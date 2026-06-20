export type CategoryKind = "expense" | "income";

export const DEFAULT_CATEGORIES: {
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
}[] = [
  { name: "Travel", icon: "plane", color: "#3B82F6", kind: "expense" },
  { name: "Food & Dining", icon: "utensils", color: "#F97316", kind: "expense" },
  { name: "Groceries", icon: "shopping-basket", color: "#22C55E", kind: "expense" },
  { name: "Rent/Housing", icon: "home", color: "#8B5CF6", kind: "expense" },
  { name: "Transport", icon: "bus", color: "#06B6D4", kind: "expense" },
  { name: "Shopping", icon: "shopping-bag", color: "#EC4899", kind: "expense" },
  { name: "Bills & Utilities", icon: "receipt", color: "#EAB308", kind: "expense" },
  { name: "Entertainment", icon: "clapperboard", color: "#A855F7", kind: "expense" },
  { name: "Health", icon: "heart-pulse", color: "#EF4444", kind: "expense" },
  { name: "Income", icon: "wallet", color: "#10B981", kind: "income" },
];
