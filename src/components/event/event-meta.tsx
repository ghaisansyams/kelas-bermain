import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function MetaRow({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("flex items-start gap-2 text-sm text-muted", className)}>
      <Icon className="mt-0.5 size-4 shrink-0 text-brand/70" aria-hidden />
      <span className="min-w-0">{children}</span>
    </span>
  );
}
