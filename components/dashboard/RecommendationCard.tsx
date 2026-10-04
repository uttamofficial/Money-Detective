import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Recommendation } from "@/lib/mock-data";

export function RecommendationCard({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Your Next Moves</CardTitle>
        <CardDescription>
          Ranked by money saved — start at the top
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ol className="space-y-4">
          {recommendations.map((rec, i) => (
            <li key={rec.id} className="flex gap-3.5">
              <span className="font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-900 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-stone-900">
                    {rec.title}
                  </p>
                  <Badge tone="success">{rec.saving}</Badge>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-stone-500">
                  {rec.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
