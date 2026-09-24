import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Single source of the page gutter: 20px on phones, growing with the viewport. */
export function Container({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag className={cn("mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8", className)}>
      {children}
    </Tag>
  );
}
