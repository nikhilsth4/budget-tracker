"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { validateShift, validateTransaction } from "@/lib/validation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { createTransaction } from "@/lib/data/transactions";
import { createShift, updateShift } from "@/lib/data/shifts";
import type { AddMode } from "./AddSheetContext";
import type { CategoryRow, EmployerRow, ShiftRow } from "@/lib/supabase/types";

const SHIFT_TYPES = ["Morning", "Afternoon", "Evening", "Night"];
const LAST_CATEGORY = "bt:lastCategoryId";
const LAST_EMPLOYER = "bt:lastEmployerId";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Local "YYYY-MM-DDTHH:mm" for a datetime-local input. */
function nowLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

/** ISO timestamp → local "YYYY-MM-DDTHH:mm" for a datetime-local input. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function AddSheet({
  open,
  onClose,
  categories,
  employers,
  onCreated,
  defaultMode = "out",
  editShift = null,
  createTransactionFn,
  createShiftFn,
  updateShiftFn,
}: {
  open: boolean;
  onClose: () => void;
  categories: CategoryRow[];
  employers: EmployerRow[];
  onCreated: () => void;
  defaultMode?: AddMode;
  editShift?: ShiftRow | null;
  createTransactionFn?: typeof createTransaction;
  createShiftFn?: typeof createShift;
  updateShiftFn?: typeof updateShift;
}) {
  const isEditing = editShift !== null;
  const toast = useToast();
  const [mode, setMode] = useState<AddMode>(defaultMode);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Transaction fields
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [occurredAt, setOccurredAt] = useState(todayISO());
  const [note, setNote] = useState("");

  // Shift fields
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [shiftType, setShiftType] = useState("");
  const [clockIn, setClockIn] = useState(nowLocal());
  const [clockOut, setClockOut] = useState(nowLocal());
  const [pay, setPay] = useState("");

  // On open: prefill from the shift being edited, else reset to smart defaults.
  useEffect(() => {
    if (!open) return;
    setErrors([]);

    if (editShift) {
      setMode("shift");
      setEmployerId(editShift.employer_id);
      setShiftType(editShift.shift_type ?? "");
      setClockIn(toLocalInput(editShift.clock_in));
      setClockOut(toLocalInput(editShift.clock_out));
      setPay(editShift.pay != null ? String(editShift.pay) : "");
      setNote(editShift.note ?? "");
      return;
    }

    setMode(defaultMode);
    setAmount("");
    setNote("");
    setPay("");
    setShiftType("");
    setOccurredAt(todayISO());
    setClockIn(nowLocal());
    setClockOut(nowLocal());
    const lastCat = read(LAST_CATEGORY);
    setCategoryId(
      categories.find((c) => c.id === lastCat)?.id ?? categories[0]?.id ?? null,
    );
    const lastEmp = read(LAST_EMPLOYER);
    setEmployerId(
      employers.find((e) => e.id === lastEmp)?.id ?? employers[0]?.id ?? null,
    );
  }, [open, defaultMode, editShift, categories, employers]);

  const persistTransaction = createTransactionFn ?? createTransaction;
  const persistShift = createShiftFn ?? createShift;
  const persistUpdateShift = updateShiftFn ?? updateShift;

  async function save() {
    if (mode === "shift") {
      const errs = validateShift({ employerId, clockIn, clockOut });
      setErrors(errs);
      if (errs.length) return;
      setSaving(true);
      const fields = {
        employer_id: employerId,
        shift_type: shiftType.trim() || null,
        clock_in: new Date(clockIn).toISOString(),
        clock_out: new Date(clockOut).toISOString(),
        pay: pay.trim() ? Number(pay) : null,
        note: note.trim() || null,
        worked_on: clockIn.slice(0, 10),
      };
      try {
        if (editShift) {
          await persistUpdateShift(createBrowserSupabase(), editShift.id, fields);
          toast.show("Shift updated");
        } else {
          await persistShift(createBrowserSupabase(), fields);
          toast.show("Shift added");
        }
        if (employerId) window.localStorage.setItem(LAST_EMPLOYER, employerId);
        onCreated();
        onClose();
      } catch {
        toast.show("Couldn't save shift", "error");
      } finally {
        setSaving(false);
      }
      return;
    }

    const errs = validateTransaction({ amount, categoryId });
    setErrors(errs);
    if (errs.length) return;
    setSaving(true);
    try {
      await persistTransaction(createBrowserSupabase(), {
        category_id: categoryId,
        amount: Number(amount),
        direction: mode === "in" ? "in" : "out",
        note: note.trim() || null,
        occurred_at: occurredAt,
      });
      if (categoryId) window.localStorage.setItem(LAST_CATEGORY, categoryId);
      toast.show(mode === "in" ? "Income added" : "Expense added");
      onCreated();
      onClose();
    } catch {
      toast.show("Couldn't save", "error");
    } finally {
      setSaving(false);
    }
  }

  const segments: { key: AddMode; label: string }[] = [
    { key: "in", label: "In" },
    { key: "out", label: "Out" },
    { key: "shift", label: "Shift" },
  ];

  const payNoteFields = (
    <>
      <Field label="Pay (optional)">
        <input
          inputMode="decimal"
          value={pay}
          onChange={(e) => setPay(e.target.value)}
          placeholder="0.00"
          className={inputClass}
        />
      </Field>
      <Field label="Note (optional)">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything to remember?"
          className={inputClass}
        />
      </Field>
    </>
  );

  return (
    <Sheet open={open} onClose={onClose} title={isEditing ? "Edit shift" : "Add"}>
      {/* Segmented control — hidden when editing an existing shift */}
      {!isEditing && (
        <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-[var(--surface-2)] p-1">
          {segments.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setMode(s.key);
                setErrors([]);
              }}
              className="rounded-lg py-2 text-sm font-medium transition"
              style={{
                background: mode === s.key ? "var(--surface)" : "transparent",
                color: mode === s.key ? "var(--ink)" : "var(--muted)",
                boxShadow: mode === s.key ? "var(--shadow)" : "none",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {mode === "shift" ? (
        <div className="space-y-4">
          <Field label="Where">
            <ChipRow
              items={employers.map((e) => ({ id: e.id, label: e.name, color: e.color }))}
              selected={employerId}
              onSelect={setEmployerId}
              empty="Add an employer in Settings first."
            />
          </Field>
          <Field label="Type">
            <input
              list="shift-types"
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value)}
              placeholder="Morning, Server…"
              className={inputClass}
            />
            <datalist id="shift-types">
              {SHIFT_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Clock in">
              <input
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Clock out">
              <input
                type="datetime-local"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          {isEditing ? (
            <div className="space-y-4">{payNoteFields}</div>
          ) : (
            <Collapsible label="+ pay / note">{payNoteFields}</Collapsible>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Amount">
            <input
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4 text-2xl font-semibold outline-none focus:border-[var(--accent)]"
            />
          </Field>
          <Field label="Category">
            <ChipRow
              items={categories.map((c) => ({ id: c.id, label: c.name, color: c.color }))}
              selected={categoryId}
              onSelect={setCategoryId}
              empty="Add a category in Settings first."
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Collapsible label="+ note">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was it for?"
              className={inputClass}
            />
          </Collapsible>
        </div>
      )}

      {errors.length > 0 && (
        <ul className="mt-4 space-y-1">
          {errors.map((e) => (
            <li key={e} className="text-sm text-[var(--danger)]">
              {e}
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="mt-6 w-full rounded-xl bg-[var(--accent)] py-3.5 font-semibold text-white shadow-[0_8px_20px_-8px_rgba(190,24,93,0.6)] transition active:scale-[0.99] disabled:opacity-60"
      >
        {saving ? "Saving…" : isEditing ? "Save changes" : "Save"}
      </button>
    </Sheet>
  );
}

const inputClass =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base outline-none focus:border-[var(--accent)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function ChipRow({
  items,
  selected,
  onSelect,
  empty,
}: {
  items: { id: string; label: string; color: string }[];
  selected: string | null;
  onSelect: (id: string) => void;
  empty: string;
}) {
  if (items.length === 0) return <p className="text-sm text-[var(--muted)]">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = selected === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onSelect(it.id)}
            className="rounded-full px-3 py-1.5 text-sm font-medium transition"
            style={{
              background: active ? it.color : "var(--surface-2)",
              color: active ? "#fff" : "var(--ink)",
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function Collapsible({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-[var(--accent)]"
      >
        {label}
      </button>
    );
  return <div className="space-y-4">{children}</div>;
}
