import type { ReactNode } from "react";

export function MobileShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen w-full bg-muted/40 flex items-stretch justify-center">
      <div className={`w-full max-w-[440px] min-h-screen bg-background flex flex-col ${className}`}>
        {children}
      </div>
    </div>
  );
}
