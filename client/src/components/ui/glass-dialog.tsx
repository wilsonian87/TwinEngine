/**
 * OmniVor Glass Dialog
 *
 * Premium dialog/modal variant with:
 * - Glass-morphism background
 * - Brand border accents
 * - Smooth enter/exit animations
 */

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const GlassDialog = DialogPrimitive.Root;
const GlassDialogTrigger = DialogPrimitive.Trigger;
const GlassDialogPortal = DialogPrimitive.Portal;
const GlassDialogClose = DialogPrimitive.Close;

const GlassDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50",
      "bg-black/60 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
GlassDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const GlassDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <GlassDialogPortal>
    <GlassDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
        "w-full max-w-lg",
        "duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className
      )}
      style={{
        background: "rgba(10, 10, 11, 0.92)",
        backdropFilter: "blur(24px)",
        borderRadius: "24px",
        border: "1px solid rgba(107, 33, 168, 0.25)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 50px rgba(107, 33, 168, 0.1)",
      }}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className={cn(
          "absolute right-4 top-4 rounded-lg p-1.5",
          "opacity-70 ring-offset-background transition-all duration-200",
          "hover:opacity-100 hover:bg-white/5",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:pointer-events-none"
        )}
      >
        <X className="h-4 w-4 text-foreground" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </GlassDialogPortal>
));
GlassDialogContent.displayName = DialogPrimitive.Content.displayName;

const GlassDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 p-6 pb-0", className)}
    {...props}
  />
);
GlassDialogHeader.displayName = "GlassDialogHeader";

const GlassDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4",
      "border-t border-border",
      className
    )}
    {...props}
  />
);
GlassDialogFooter.displayName = "GlassDialogFooter";

const GlassDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
GlassDialogTitle.displayName = DialogPrimitive.Title.displayName;

const GlassDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm mt-2 text-muted-foreground", className)}
    {...props}
  />
));
GlassDialogDescription.displayName = DialogPrimitive.Description.displayName;

// Body content wrapper with consistent padding
const GlassDialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6", className)} {...props} />
);
GlassDialogBody.displayName = "GlassDialogBody";

export {
  GlassDialog,
  GlassDialogPortal,
  GlassDialogOverlay,
  GlassDialogTrigger,
  GlassDialogClose,
  GlassDialogContent,
  GlassDialogHeader,
  GlassDialogFooter,
  GlassDialogTitle,
  GlassDialogDescription,
  GlassDialogBody,
};
