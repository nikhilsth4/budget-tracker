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

  it("opens in edit mode: shift-only, prefilled, no In/Out/Shift toggle", () => {
    const editShift = {
      id: "s1",
      user_id: "u",
      employer_id: "e1",
      shift_type: "Morning",
      clock_in: "2026-06-17T09:00:00Z",
      clock_out: "2026-06-17T17:00:00Z",
      pay: 120,
      note: "covered for Sam",
      worked_on: "2026-06-17",
      created_at: "",
    };
    render(
      <AddSheet
        open
        onClose={() => {}}
        categories={categories as never}
        employers={employers as never}
        onCreated={() => {}}
        editShift={editShift as never}
      />,
    );
    // No mode toggle when editing an existing shift.
    expect(screen.queryByRole("button", { name: "Out" })).toBeNull();
    // Pay and note are shown (not hidden behind the collapsible) and prefilled.
    expect(screen.getByDisplayValue("120")).toBeInTheDocument();
    expect(screen.getByDisplayValue("covered for Sam")).toBeInTheDocument();
    // Save button reflects edit intent.
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("opens a transaction in edit mode: In/Out only, prefilled, Save changes", () => {
    const editTransaction = {
      id: "t1",
      user_id: "u",
      category_id: "c1",
      amount: 24,
      direction: "out",
      note: "Taxi to airport",
      occurred_at: "2026-06-17",
      created_at: "",
    };
    render(
      <AddSheet
        open
        onClose={() => {}}
        categories={categories as never}
        employers={employers as never}
        onCreated={() => {}}
        editTransaction={editTransaction as never}
      />,
    );
    // In/Out stay (direction editable) but Shift is gone when editing a transaction.
    expect(screen.getByRole("button", { name: "Out" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Shift" })).toBeNull();
    // Amount and note are prefilled (note shown, not collapsed).
    expect(screen.getByDisplayValue("24")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Taxi to airport")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });
});
