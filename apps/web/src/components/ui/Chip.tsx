"use client";

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const chipVariants = cva(
  'inline-flex items-center justify-center gap-1 rounded-full border text-[11px] font-medium tracking-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        solid: 'border-transparent bg-gradient-to-r from-teal-400 to-cyan-300 text-slate-900 shadow-[0_12px_35px_rgba(45,212,191,0.35)]',
        soft: 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10',
        ghost: 'border-transparent text-white/70',
        outline: 'border-white/20 text-white/80',
      },
      size: {
        sm: 'px-3 py-1 text-[11px]',
        md: 'px-4 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'soft',
      size: 'sm',
    },
  }
);

export interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {
  asChild?: boolean;
  active?: boolean;
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, variant, size, asChild = false, active, type = 'button', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        className={cn(
          chipVariants({ variant, size }),
          active && 'border-transparent bg-gradient-to-r from-teal-400 to-cyan-300 text-slate-900',
          className
        )}
        {...props}
      />
    );
  }
);
Chip.displayName = 'Chip';

export { Chip, chipVariants };
