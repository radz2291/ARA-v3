import React from "react";
import { cn } from "@/lib/utils";

interface TableWrapperProps {
  children: React.ReactNode;
}

export function TableWrapper({ children }: TableWrapperProps) {
  return (
    <div className="my-4 w-full overflow-hidden rounded-lg border border-border shadow-sm">
      <div className="overflow-x-auto overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-primary/30">
        {children}
      </div>
    </div>
  );
}
