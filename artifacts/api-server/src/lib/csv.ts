import fs from "fs/promises";
import { parse } from "csv-parse/sync";

export function parseCsv(content: string): Record<string, string>[] {
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

export async function loadCsv(filePath: string): Promise<Record<string, string>[]> {
  const content = await fs.readFile(filePath, "utf-8");
  return parseCsv(content);
}
