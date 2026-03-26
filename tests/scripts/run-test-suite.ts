import { execSync } from "child_process";
import { performance } from "perf_hooks";

/**
 * This script runs the end-to-end test suites in a loop, providing progress updates and ETA estimates.
 */

// Change directory and set environment variables
process.env.CI = "true";
process.env.METRICS_ONLY = "true";

// Define parameters
const totalRuns = 30;
const suites = ["baseline", "commuter", "budget", "worst"];
const totalSteps = totalRuns * suites.length;

// Helper function to format seconds into hh:mm:ss
const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const startTime = performance.now();

for (let run = 1; run <= totalRuns; run++) {
  const completedRuns = run - 1;
  let etaText = "Calculating...";

  if (completedRuns > 0) {
    const elapsedSeconds = (performance.now() - startTime) / 1000;
    const avgTimePerRun = elapsedSeconds / completedRuns;
    const runsRemaining = totalRuns - completedRuns;
    const secondsRemaining = avgTimePerRun * runsRemaining;
    etaText = formatTime(secondsRemaining);
  }

  let suiteIndex = 0;
  for (const suite of suites) {
    suiteIndex++;

    const currentOverallStep = completedRuns * suites.length + suiteIndex;
    const overallPercentComplete = Math.floor(
      ((currentOverallStep - 1) / totalSteps) * 100
    );
    const suitePercentComplete = Math.floor(
      ((suiteIndex - 1) / suites.length) * 100
    );

    // Terminal Output (Node equivalent of Write-Progress for CI environments)
    console.log(`\n${"=".repeat(60)}`);
    console.log(
      `[Overall Progress] Iteration ${run} of ${totalRuns} | Overall ETA: ${etaText} | ${overallPercentComplete}%`
    );
    console.log(`[Current Suite] Running: ${suite} | ${suitePercentComplete}%`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      // Run the pnpm command synchronously, keeping the output tied to the current terminal
      execSync(`pnpm run test:e2e:${suite}`, { stdio: "inherit" });
    } catch (error) {
      console.error(
        `\n❌ Error executing suite '${suite}' on run ${run}. Exiting...`
      );
      process.exit(1);
    }
  }
}

// Calculate final time
const totalElapsedSeconds = (performance.now() - startTime) / 1000;
const totalTime = formatTime(totalElapsedSeconds);

// Print success message in green text
console.log(
  `\n\x1b[32mAll ${totalRuns} iterations completed in ${totalTime}.\x1b[0m`
);
