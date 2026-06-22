import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskRow } from "@/components/tasks/TaskRow";
import type { TaskRow as TaskRowType } from "@/lib/supabase/types";

const task: TaskRowType = {
  id: "a",
  user_id: "u",
  title: "Gym",
  kind: "daily",
  due_on: null,
  time_of_day: "07:00:00",
  sort: 0,
  archived_at: null,
  created_at: "2026-06-01T00:00:00Z",
};

describe("TaskRow", () => {
  it("renders the title and time", () => {
    render(
      <ul>
        <TaskRow
          view={{ task, done: false, overdue: false, streak: 3 }}
          onToggle={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      </ul>,
    );
    expect(screen.getByText("Gym")).toBeInTheDocument();
    expect(screen.getByText(/7:00/)).toBeInTheDocument();
  });

  it("tapping the row toggles completion to the opposite state", () => {
    const onToggle = vi.fn();
    render(
      <ul>
        <TaskRow
          view={{ task, done: false, overdue: false, streak: 0 }}
          onToggle={onToggle}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      </ul>,
    );
    fireEvent.click(screen.getByRole("button", { name: /toggle gym/i }));
    expect(onToggle).toHaveBeenCalledWith(task, true);
  });
});
