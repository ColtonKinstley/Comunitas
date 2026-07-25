/** Loading skeletons and the retryable error card, shared by all three screens. */
import { TriangleAlert } from "lucide-react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";

/** Card-shaped shimmer so the layout doesn't jump when data lands. */
export function SkeletonList({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="animate-pulse">
          <div className="flex gap-3">
            <div className="size-11 shrink-0 rounded-2xl bg-line/70" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 w-3/4 rounded bg-line/70" />
              <div className="h-3 w-1/2 rounded bg-line/60" />
              <div className="h-3 w-2/3 rounded bg-line/50" />
            </div>
          </div>
          <div className="mt-5 h-12 rounded-2xl bg-line/40" />
        </Card>
      ))}
    </div>
  );
}

export function LoadingNote({ label }: { label: string }) {
  return (
    <p className="py-6 text-center text-base text-ink-faint" role="status">
      {label}
    </p>
  );
}

interface ErrorCardProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <Card className="border-danger-500/40 bg-danger-100/40">
      <div className="flex items-start gap-3">
        <TriangleAlert size={24} className="mt-0.5 shrink-0 text-danger-700" aria-hidden />
        <div className="flex-1">
          <h2 className="text-lg font-bold text-danger-700">We couldn't load this</h2>
          <p className="mt-1 text-base text-ink-soft">{message}</p>
          {onRetry && (
            <Button variant="secondary" className="mt-4" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
