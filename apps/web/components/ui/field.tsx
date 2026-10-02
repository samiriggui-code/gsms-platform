import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-[10px] border border-input bg-background px-3 text-[14px] text-foreground placeholder:text-muted-foreground/70 transition-[border-color,box-shadow] hover:border-foreground/25 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:opacity-60 aria-[invalid=true]:border-destructive";

export function Label({ className, ...props }: ComponentPropsWithoutRef<"label">) {
  return <label className={cn("text-[13px]/5 font-medium", className)} {...props} />;
}

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentPropsWithoutRef<"textarea">) {
  return <textarea className={cn(control, "min-h-28 py-2.5 leading-6", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentPropsWithoutRef<"select">) {
  return <select className={cn(control, "h-10 pr-8", className)} {...props} />;
}
