import { TableDetails } from "extract-pg-schema";
import { writeFile } from "fs/promises";
import path from "path";

import * as TableBuilder from "../builders/table.builder";
import { ParsedTableConfig } from "../config/parser";

export async function parse({
  table,
  output_path,
  config,
  code_formatter,
}: ParseArgs): Promise<void> {
  const tableFileContent = await TableBuilder.build({
    table,
    config,
  });

  const formattedTableFileContent = await code_formatter(tableFileContent);

  await writeFile(
    path.join(output_path, `${table.name}.ts`),
    formattedTableFileContent,
    "utf-8",
  );
}

type ParseArgs = {
  table: TableDetails;
  output_path: string;
  config: NonIgnoredConfig;
  code_formatter: (raw: string) => Promise<string>;
};

export type NonIgnoredConfig = Extract<ParsedTableConfig, { ignore?: false }>;
