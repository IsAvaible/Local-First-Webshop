export interface TraceEvent {
  name: string;
  tid: number; // Thread ID
  dur?: number; // Duration in microseconds
  args?: {
    name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TraceData {
  traceEvents: TraceEvent[];
}

export interface SyncMetrics {
  droppedFrames: number;
  blockingTimeMs: number;
}

/**
 * Parses a Chromium trace file to extract Dropped Frames and Main Thread Blocking Time.
 */
export function parseTraceForSyncMetrics(traceData: TraceData): SyncMetrics {
  let droppedFrames = 0;
  let blockingTimeMs = 0;

  // Find the Main Thread IDs for the renderer processes
  const rendererMainThreads = new Set(
    traceData.traceEvents
      .filter(
        (e) => e.name === "thread_name" && e.args?.name === "CrRendererMain"
      )
      .map((e) => e.tid)
  );

  traceData.traceEvents.forEach((event) => {
    // Count Dropped Frames
    if (event.name === "DroppedFrame") {
      droppedFrames++;
    }

    // Calculate Main Thread Blocking Time
    if (
      event.name === "RunTask" &&
      rendererMainThreads.has(event.tid) &&
      event.dur
    ) {
      // Convert microseconds to milliseconds
      const durationMs = event.dur / 1000;

      // If we want to measure TBT, Math.max(0, durationMs - 50) should be used
      blockingTimeMs += durationMs;
    }
  });

  return {
    droppedFrames,
    blockingTimeMs
  };
}
