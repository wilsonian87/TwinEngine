/**
 * Engagement Grade — Letter grade (A–F) with visual indicator.
 *
 * Converts numeric engagement score to a scannable letter grade.
 * "A- (56)" is instantly comparable; "56 Engagement" is not.
 */

import { cn } from "@/lib/utils";

interface EngagementGradeProps {
  score: number;
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

interface GradeInfo {
  letter: string;
  modifier: string;
  color: string;
  bgColor: string;
}

function getGrade(score: number): GradeInfo {
  if (score >= 93) return { letter: "A", modifier: "+", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-500/10" };
  if (score >= 85) return { letter: "A", modifier: "", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-500/10" };
  if (score >= 80) return { letter: "A", modifier: "-", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-500/10" };
  if (score >= 73) return { letter: "B", modifier: "+", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10" };
  if (score >= 65) return { letter: "B", modifier: "", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10" };
  if (score >= 60) return { letter: "B", modifier: "-", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10" };
  if (score >= 53) return { letter: "C", modifier: "+", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10" };
  if (score >= 45) return { letter: "C", modifier: "", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10" };
  if (score >= 40) return { letter: "C", modifier: "-", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10" };
  if (score >= 33) return { letter: "D", modifier: "+", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10" };
  if (score >= 25) return { letter: "D", modifier: "", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10" };
  if (score >= 20) return { letter: "D", modifier: "-", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10" };
  return { letter: "F", modifier: "", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-500/10" };
}

const sizes = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

export function EngagementGrade({ score, showScore = true, size = "md", className }: EngagementGradeProps) {
  const grade = getGrade(score);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-md font-bold",
          sizes[size],
          grade.color,
          grade.bgColor
        )}
      >
        {grade.letter}{grade.modifier}
      </div>
      {showScore && (
        <span className="text-xs text-muted-foreground tabular-nums">
          ({Math.round(score)})
        </span>
      )}
    </div>
  );
}
