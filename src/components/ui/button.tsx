"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-tertiary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent-primary text-background-primary hover:bg-accent-primary/90 hover:shadow-[0_0_20px_rgba(0,217,165,0.4)]",
        destructive:
          "bg-accent-secondary text-white hover:bg-accent-secondary/90 hover:shadow-[0_0_20px_rgba(255,77,106,0.4)]",
        outline:
          "border border-border bg-transparent text-text-primary hover:bg-background-tertiary hover:border-accent-tertiary/50",
        secondary:
          "bg-accent-tertiary text-white hover:bg-accent-tertiary/90 hover:shadow-[0_0_20px_rgba(124,92,255,0.4)]",
        ghost: "text-text-secondary hover:text-text-primary hover:bg-background-tertiary",
        link: "text-accent-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
