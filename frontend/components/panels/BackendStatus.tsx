"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Free-tier backends sleep. Rather than a spinner that says nothing, the first
 * two seconds are silent and after that the wait is named (PRD 9.8).
 */
export function BackendStatus({ onRetry }: { onRetry: () => void }) {
  const [slow, setSlow] = useState(false);
  const { isError, isFetching, refetch } = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    retry: 3,
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 8000),
  });

  useEffect(() => {
    if (!isFetching) return setSlow(false);
    const id = setTimeout(() => setSlow(true), 2000);
    return () => clearTimeout(id);
  }, [isFetching]);

  if (isFetching && slow) {
    return (
      <Alert className="panel">
        <AlertTitle>Waking up the model</AlertTitle>
        <AlertDescription>
          The inference service is starting. This takes a few seconds on a cold start.
        </AlertDescription>
      </Alert>
    );
  }

  if (!isError) return null;

  return (
    <Alert variant="destructive" className="panel">
      <AlertTitle>Can&apos;t reach the model service</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        <span>Inference needs the Python backend. Check that it&apos;s running on port 8000.</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            void refetch();
            onRetry();
          }}
        >
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
