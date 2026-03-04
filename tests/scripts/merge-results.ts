import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { once } from "events";
import { fileURLToPath } from "url";

// Extracted to a constant for better visibility
const FILE_PATTERN =
  /^performance-metrics-(local-first|ssr)-(baseline|budget|commuter|worst-case)\.csv$/;

/**
 * Merges matching CSV files in a directory, appending architecture and profile columns.
 * @param inputDir - The directory to scan for CSVs.
 * @param outputFile - The name of the file to output the merged results.
 */
async function mergeCSVFiles(inputDir: string, outputFile: string) {
  const outPath = path.resolve(inputDir, outputFile);

  const files = fs
    .readdirSync(inputDir)
    .filter((f) => FILE_PATTERN.test(f) && f !== outputFile);

  if (files.length === 0) {
    console.log("⚠️ No matching performance metrics files found.");
    return;
  }

  const outStream = fs.createWriteStream(outPath, { encoding: "utf8" });
  let isFirstFile = true;

  const writeLine = async (line: string) => {
    if (!outStream.write(line)) {
      await once(outStream, "drain");
    }
  };

  try {
    for (const filename of files) {
      const match = FILE_PATTERN.exec(filename);
      if (!match) continue; // Fallback safety check

      const [, arch, profile] = match;
      const filePath = path.resolve(inputDir, filename);

      const fileStream = fs.createReadStream(filePath, { encoding: "utf8" });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      let isFirstLine = true;

      for await (const line of rl) {
        if (!line.trim()) continue; // Skip empty lines

        if (isFirstLine) {
          isFirstLine = false;
          // Only write the header for the very first file
          if (isFirstFile) {
            await writeLine(`${line},Architecture,Profile\n`);
            isFirstFile = false;
          }
          continue;
        }

        // Write data rows
        await writeLine(`${line},"${arch}","${profile}"\n`);
      }

      console.log(`[merge-results.ts] Merged: ${filename}`);
    }

    console.log(
      `\n[merge-results.ts] Successfully merged ${files.length} files into ${outputFile}`
    );
  } catch (error) {
    console.error(
      `[merge-results.ts] A fatal error occurred during merging:`,
      error
    );
  } finally {
    outStream.end();
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputDirectory = `${__dirname}/../results`;
const outputFilename = "results.csv";

void mergeCSVFiles(inputDirectory, outputFilename);
