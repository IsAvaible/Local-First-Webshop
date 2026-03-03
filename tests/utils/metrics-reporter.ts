import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import * as fs from "fs";
import * as path from "path";

export const MetricType = {
  // Performance
  INITIAL_SYNC_TIME: "metric:initial-sync-time",
  INTERACTION_LATENCY: "metric:interaction-latency",
  STORAGE_USAGE: "metric:storage-usage",
  JS_HEAP_USED: "metric:js-heap-used",
  INITIAL_LOAD_TIME: "metric:initial-load-time",
  CACHED_LOAD_TIME: "metric:cached-load-time",
  LAG_SPIKES: "metric:lag-spikes-count",
  TOTAL_SCROLL_LAG: "metric:total-scroll-lag-ms",

  // Network
  BANDWIDTH_HOME_LOAD: "metric:bandwidth-home-load",
  BANDWIDTH_SEARCH_NAV: "metric:bandwidth-search-nav",
  BANDWIDTH_PRODUCT_NAV: "metric:bandwidth-product-nav",
  DELTA_UPDATE_PAYLOAD_SIZE: "metric:delta-update-payload-size",

  // Offline
  SYNC_RECOVERY_TIME: "metric:sync-recovery-time",

  // Consistency
  TIME_TO_CONSISTENCY: "metric:time-to-consistency",
  SERVER_VALIDATED_SUBTOTAL: "metric:server-validated-subtotal"
} as const;

export default class MetricsCsvReporter implements Reporter {
  private readonly outputFolder: string;
  private readonly csvFilePath: string;

  constructor(options: { outputFolder?: string } = {}) {
    if (!options.outputFolder) {
      throw new Error("outputFolder option is required for MetricsCsvReporter");
    }

    this.outputFolder = options.outputFolder;

    const variantName = process.env.APP_MODE;
    const profileName = process.env.TEST_PROFILE ?? "baseline";

    this.csvFilePath = path.join(
      this.outputFolder,
      `performance-metrics-${variantName}-${profileName}.csv`
    );
  }

  onBegin() {
    fs.mkdirSync(this.outputFolder, { recursive: true });

    if (!fs.existsSync(this.csvFilePath)) {
      fs.writeFileSync(
        this.csvFilePath,
        "Timestamp,File,Suite Context,Test Name,Metric Name,Value,Unit,Status\n"
      );
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const annotations = test.annotations.filter((a) =>
      (Object.values(MetricType) as string[]).includes(a.type)
    );

    if (!annotations?.length) {
      return;
    }

    const file = path.basename(test.location.file);
    const testName = test.title;
    const suiteContext = this.getSuiteContext(test);

    const timestamp = new Date().toISOString();
    const status = result.status;

    const csvRows = annotations.map((annotation) => {
      let value = annotation.description ?? "";
      let unit = "";

      try {
        const parsed = JSON.parse(value) as { value: string; unit: string };
        if (parsed && typeof parsed === "object") {
          value = parsed.value !== undefined ? String(parsed.value) : "";
          unit = parsed.unit !== undefined ? String(parsed.unit) : "";
        }
      } catch {
        // Fallback to raw string
      }

      return [
        timestamp,
        this.escapeCsv(file),
        this.escapeCsv(suiteContext),
        this.escapeCsv(testName),
        this.escapeCsv(annotation.type),
        this.escapeCsv(value),
        this.escapeCsv(unit),
        status
      ].join(",");
    });

    fs.appendFileSync(this.csvFilePath, `${csvRows.join("\n")}\n`);
  }

  // Helper method to safely escape commas and quotes inside CSV fields
  private escapeCsv(str: string): string {
    if (str === null || str === undefined) return '""';
    return `"${String(str).replace(/"/g, '""')}"`;
  }

  // Helper to accurately extract 'describe' blocks
  private getSuiteContext(test: TestCase): string {
    const parents: string[] = [];
    let parent = test.parent;

    // Traverse upwards. Stop when hitting the file level, project level, or root.
    while (parent && !["file", "project", "root"].includes(parent.type)) {
      if (parent.title) parents.unshift(parent.title);
      if (parent.parent) {
        parent = parent.parent;
      }
    }

    return parents.length > 0 ? parents.join(" > ") : "Root";
  }
}
