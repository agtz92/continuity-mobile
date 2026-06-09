import { useMutation } from "@apollo/client/react";
import { SUBMIT_BUG_REPORT } from "@/lib/graphql";

/**
 * Mutations for the bug-report / feedback inbox (user → admin, one-way).
 * `submitBugReport` returns a boolean and never throws to the caller — errors
 * are surfaced at the screen layer (the screen shows a toast on `false`).
 */
export function useReportMutations() {
  const [submit] = useMutation(SUBMIT_BUG_REPORT);

  const submitBugReport = async (r: {
    topic: string;
    message: string;
  }): Promise<boolean> => {
    try {
      await submit({
        variables: {
          data: {
            topic: r.topic,
            message: r.message,
            platform: "app",
          },
        },
      });
      return true;
    } catch {
      return false;
    }
  };

  return { submitBugReport };
}
