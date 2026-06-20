import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddSheet } from "@/components/add/AddSheet";

const categories = [
  {
    id: "c1",
    name: "Travel",
    icon: "plane",
    color: "#3B82F6",
    kind: "expense",
    monthly_limit: null,
    user_id: "u",
    created_at: "",
  },
];
const employers = [
  { id: "e1", name: "Cafe", color: "#000", user_id: "u", created_at: "" },
];

describe("AddSheet", () => {
  it("shows transaction form by default with category options", () => {
    render(
      <AddSheet
        open
        onClose={() => {}}
        categories={categories as never}
        employers={employers as never}
        onCreated={() => {}}
      />,
    );
    expect(screen.getByPlaceholderText(/amount/i)).toBeInTheDocument();
    expect(screen.getByText("Travel")).toBeInTheDocument();
  });

  it("switches to shift form when Shift toggle clicked", () => {
    render(
      <AddSheet
        open
        onClose={() => {}}
        categories={categories as never}
        employers={employers as never}
        onCreated={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /shift/i }));
    expect(screen.getByText(/clock in/i)).toBeInTheDocument();
  });

  it("blocks save on invalid transaction and shows errors", () => {
    const onCreated = vi.fn();
    render(
      <AddSheet
        open
        onClose={() => {}}
        categories={categories as never}
        employers={employers as never}
        onCreated={onCreated}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByText(/valid amount/i)).toBeInTheDocument();
  });
});
