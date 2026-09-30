import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '../../lib/cn';

/** Default = Grace field chrome (10px mono uppercase). Pass className to override. */
export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('field-label peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;
