"use client";

/**
 * useInterpret — memoised React wrapper around the interpretation engine.
 *
 * The engine itself is pure, so non-React callers should use
 * `interpretReading` directly.
 */

import { useMemo } from "react";
import type { Interpretation, VitalReading } from "@/types/schema";
import {
  classifyReading,
  interpretationEngine,
  interpretReading,
} from "@/lib/engine/interpret";

export function useInterpret(
  reading: VitalReading,
  context: VitalReading[] = []
): Interpretation {
  return useMemo(
    () => interpretReading(reading, context),
    [reading, context]
  );
}

/** Non-hook convenience wrapper for event handlers. */
export function interpret(
  reading: VitalReading,
  context: VitalReading[] = []
): Interpretation {
  return interpretReading(reading, context);
}

export type { Interpretation, VitalReading };
export { interpretationEngine, classifyReading };
