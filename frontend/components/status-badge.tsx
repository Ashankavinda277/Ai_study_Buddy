import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";

const STATUS_META: Record<
  string,
  { label: string; badgeClass: string; icon: typeof CheckCircle2 }
> = {
  ready: {
    label: "Ready",
    badgeClass: "bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    badgeClass: "bg-indigo-50 text-indigo-700",
    icon: Loader2,
  },
  pending: {
    label: "Pending",
    badgeClass: "bg-amber-50 text-amber-700",
    icon: Clock,
  },
  failed: {
    label: "Failed",
    badgeClass: "bg-red-50 text-red-700",
    icon: AlertCircle,
  },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badgeClass}`}
    >
      <Icon className={`h-3 w-3 ${status === "processing" ? "animate-spin" : ""}`} />
      {meta.label}
    </span>
  );
}
