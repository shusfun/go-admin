import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cloneElement, forwardRef, isValidElement, useLayoutEffect, useRef } from "react";

import { cn } from "../lib/utils";

function assignRef<T>(ref: React.Ref<T | null> | undefined, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}

export type AppScrollbarProps = React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
  rootSlot?: React.ReactElement<{ children?: React.ReactNode; className?: string }>;
  viewportProps?: React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Viewport>;
  viewportClassName?: string;
  viewportRef?: React.Ref<React.ElementRef<typeof ScrollAreaPrimitive.Viewport> | null>;
};

const Scrollbar = forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    className={cn(
      "flex touch-none select-none p-px",
      orientation === "vertical" ? "h-full w-[7px] border-l border-l-transparent" : "h-[7px] flex-col border-t border-t-transparent",
      className,
    )}
    orientation={orientation}
    ref={ref}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 bg-[hsl(var(--foreground)/0.12)] transition-colors hover:bg-[hsl(var(--foreground)/0.22)]" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
Scrollbar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export const AppScrollbar = forwardRef<React.ElementRef<typeof ScrollAreaPrimitive.Root>, AppScrollbarProps>(
  ({ children, className, rootSlot, type = "hover", viewportClassName, viewportProps, viewportRef, ...props }, ref) => {
    const rootClassName = cn("relative overflow-hidden", className);
    const innerViewportRef = useRef<React.ElementRef<typeof ScrollAreaPrimitive.Viewport> | null>(null);

    useLayoutEffect(() => {
      assignRef(viewportRef, innerViewportRef.current);
      return () => {
        assignRef(viewportRef, null);
      };
    }, [viewportRef]);

    const content = (
      <>
        <ScrollAreaPrimitive.Viewport
          {...viewportProps}
          className={cn(
            "h-full w-full rounded-[inherit] [max-height:inherit] [max-width:inherit]",
            viewportClassName,
            viewportProps?.className,
          )}
          ref={innerViewportRef}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        <Scrollbar orientation="vertical" />
        <Scrollbar orientation="horizontal" />
        <ScrollAreaPrimitive.Corner className="bg-transparent" />
      </>
    );

    if (rootSlot && isValidElement(rootSlot)) {
      return (
        <ScrollAreaPrimitive.Root asChild ref={ref} type={type} {...props}>
          {cloneElement(rootSlot, {
            ...rootSlot.props,
            children: content,
            className: cn(rootClassName, rootSlot.props.className),
          })}
        </ScrollAreaPrimitive.Root>
      );
    }

    return (
      <ScrollAreaPrimitive.Root className={rootClassName} ref={ref} type={type} {...props}>
        {content}
      </ScrollAreaPrimitive.Root>
    );
  },
);
AppScrollbar.displayName = "AppScrollbar";
