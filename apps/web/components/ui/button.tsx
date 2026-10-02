import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,border-color,color,box-shadow,transform] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_14px_38px_-18px_var(--primary)] hover:brightness-105",
        contrast: "bg-foreground text-background hover:bg-foreground/90",
        outline: "border border-border bg-background/70 text-foreground hover:border-foreground/25 hover:bg-card",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        onInk: "bg-background text-foreground hover:bg-background/90",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
      },
      size: {
        sm: "h-8 rounded-lg px-3 text-[13px]",
        md: "h-10 rounded-[10px] px-4 text-[14px]",
        lg: "h-11 rounded-full px-6 text-[14px]",
        icon: "size-9 rounded-[10px]",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ComponentPropsWithoutRef<"button"> & ButtonVariants) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
