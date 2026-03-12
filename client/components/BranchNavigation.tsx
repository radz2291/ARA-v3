import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BranchNavigationProps {
  currentBranchId: string | null;
  availableBranches: string[];
  onBranchChange: (branchId: string) => void;
  className?: string;
}

export function BranchNavigation({
  currentBranchId,
  availableBranches,
  onBranchChange,
  className,
}: BranchNavigationProps) {
  // Don't show if only one branch
  if (availableBranches.length <= 1) {
    return null;
  }

  const currentIndex = availableBranches.indexOf(currentBranchId || "default");
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < availableBranches.length - 1;

  const handlePrev = () => {
    if (canGoPrev) {
      onBranchChange(availableBranches[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onBranchChange(availableBranches[currentIndex + 1]);
    }
  };

  return (
    <div className={cn("flex items-center gap-2 px-2 py-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePrev}
        disabled={!canGoPrev}
        className="h-8 w-8 p-0"
        title="Previous branch"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {currentIndex + 1} of {availableBranches.length}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleNext}
        disabled={!canGoNext}
        className="h-8 w-8 p-0"
        title="Next branch"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
