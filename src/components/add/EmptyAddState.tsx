"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { useAddSheet, type AddMode } from "./AddSheetContext";

export function EmptyAddState({
  icon,
  title,
  subtitle,
  actionLabel,
  mode,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel: string;
  mode: AddMode;
}) {
  const { open } = useAddSheet();
  return (
    <EmptyState
      icon={icon}
      title={title}
      subtitle={subtitle}
      actionLabel={actionLabel}
      onAction={() => open(mode)}
    />
  );
}
