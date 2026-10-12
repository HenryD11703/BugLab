import type { Constraints } from "./types";

/**
 * TEMPORARY bridge (removed by T13/T14). The current UI and Pyodide checker
 * still speak the old requirements shape; this maps the v2 constraints to it.
 */
export interface Requirements {
  mustContainKeyword?: string[];
  mustNotCallBuiltin?: string[];
  mustNotImport?: string[];
  mustUseLoop?: boolean;
  mustUseRecursion?: boolean;
  mustContain?: string[];
  mustNotContain?: string[];
}

export function toLegacyRequirements(c?: Constraints): Requirements | undefined {
  if (!c) return undefined;
  return {
    mustContainKeyword: [...(c.mustUseKeyword ?? []), ...(c.mustCall ?? [])],
    mustNotCallBuiltin: c.mustNotCall,
    mustNotImport: c.mustNotImport,
    mustUseLoop: c.mustUseLoop,
    mustUseRecursion: c.mustUseRecursion,
  };
}
