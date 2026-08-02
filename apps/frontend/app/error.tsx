"use client";

import { useEffect } from "react";
import { ServiceUnavailablePage } from "@/components/system/ServiceUnavailablePage";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ServiceUnavailablePage onRetry={reset} digest={error.digest} />;
}
