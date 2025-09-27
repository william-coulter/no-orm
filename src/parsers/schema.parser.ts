import { Schema } from "extract-pg-schema";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { Options } from "prettier";
import * as logger from "../logger";
import * as TableParser from "./table.parser";
import { ParsedSchemaConfig } from "../config/parser";
import { prettierFormat } from "../commands/generate";
import * as DefaultConfigs from "../config/default";
import * as EnumsBuilder from "../builders/enums.builder";
import * as DomainsBuilder from "../builders/domains.builder";
import * as RangesBuilder from "../builders/ranges.builder";

export async function parse({
  schema,
  output_path,
  config,
  prettier_config,
}: ParseArgs): Promise<void> {
  const schemaOutputPath = path.join(output_path, schema.name);
  await mkdir(schemaOutputPath, {
    recursive: true,
  });

  const enumsContent = await EnumsBuilder.build({
    schema,
  });
  const formattedEnumsContent = await prettierFormat(
    enumsContent,
    prettier_config,
  );
  await writeFile(
    path.join(schemaOutputPath, "enums.ts"),
    formattedEnumsContent,
    "utf-8",
  );

  const domainsContent = await DomainsBuilder.build({
    schema,
  });
  const formattedDomainsContent = await prettierFormat(
    domainsContent,
    prettier_config,
  );
  await writeFile(
    path.join(schemaOutputPath, "domains.ts"),
    formattedDomainsContent,
    "utf-8",
  );

  const rangesContent = await RangesBuilder.build({
    schema,
  });
  const formattedRangesContent = await prettierFormat(
    rangesContent,
    prettier_config,
  );
  await writeFile(
    path.join(schemaOutputPath, "ranges.ts"),
    formattedRangesContent,
    "utf-8",
  );

  for (const table of Object.values(schema.tables)) {
    const tableConfig =
      config.table_configs.get(table.name) ??
      DefaultConfigs.buildParsedTableConfig(true);

    if (tableConfig.ignore === true) {
      logger.debug(`Table '${table.name}' is ignored, skipping...`);
      continue;
    }

    await TableParser.parse({
      table: table,
      config: tableConfig,
      output_path: path.join(schemaOutputPath, table.name),
      prettier_config: prettier_config,
    });
  }
}

type ParseArgs = {
  schema: Schema;
  output_path: string;
  config: NonIgnoredConfig;
  prettier_config: Options | null;
};

export type NonIgnoredConfig = Extract<ParsedSchemaConfig, { ignore?: false }>;
