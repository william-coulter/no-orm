import { TableDetails } from "extract-pg-schema";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { Options } from "prettier";
import { ParsedTableConfig } from "../config/parser";
import { prettierFormat } from "../commands/generate";
import * as TableBuilder from "../builders/table.builder";

export async function parse({
  table,
  output_path,
  config,
  prettier_config,
}: ParseArgs): Promise<void> {
  await mkdir(output_path, {
    recursive: true,
  });

  const tableFileContent = await TableBuilder.build({
    table,
    config,
  });

  const formattedTableFileContent = await prettierFormat(
    tableFileContent,
    prettier_config,
  );

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
  prettier_config: Options | null;
};

export type NonIgnoredConfig = Extract<ParsedTableConfig, { ignore?: false }>;
