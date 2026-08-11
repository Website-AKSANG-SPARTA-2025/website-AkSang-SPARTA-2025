"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError } from "@/api/client";

export type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

function defaultMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Terjadi kesalahan tak terduga.";
}

/**
 * Submit state machine with a re-entrancy guard.
 *
 * The guard is a ref, not the `submitting` flag, and that distinction is the
 * whole point: setState is asynchronous, so a disabled={submitting} button is
 * still enabled during the same tick. Two fast clicks — or a click plus an
 * Enter keypress — both pass a state-based check and fire two requests. A ref
 * updates synchronously, so the second call returns before reaching the
 * network.
 */
export function useSubmit() {
  const [state, setState] = useState<SubmitState>({ kind: "idle" });
  const inFlight = useRef(false);

  const run = useCallback(
    async (
      task: () => Promise<string>,
      options?: { mapError?: (error: unknown) => string | undefined },
    ) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setState({ kind: "submitting" });

      try {
        setState({ kind: "success", message: await task() });
      } catch (error) {
        setState({
          kind: "error",
          message: options?.mapError?.(error) ?? defaultMessage(error),
        });
      } finally {
        inFlight.current = false;
      }
    },
    [],
  );

  /** Reject before any request goes out, e.g. failed local validation. */
  const fail = useCallback((message: string) => {
    if (inFlight.current) return;
    setState({ kind: "error", message });
  }, []);

  return { state, run, fail, submitting: state.kind === "submitting" };
}
