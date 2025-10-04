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

  await buildEnums({
    schema,
    output_path: path.join(schemaOutputPath, "enums"),
    prettier_config,
  });

  await buildDomains({
    schema,
    output_path: path.join(schemaOutputPath, "domains"),
    prettier_config,
  });

  await buildRanges({
    schema,
    output_path: path.join(schemaOutputPath, "ranges"),
    prettier_config,
  });

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

type BuildEnumsArgs = {
  schema: Schema;
  output_path: string;
  prettier_config: Options | null;
};

async function buildEnums({
  schema,
  output_path,
  prettier_config,
}: BuildEnumsArgs): Promise<void> {
  await mkdir(output_path, { recursive: true });

  const files = await EnumsBuilder.build({
    schema,
  });

  for (const [fileName, content] of Object.entries(files)) {
    const formattedContent = await prettierFormat(content, prettier_config);
    await writeFile(
      path.join(output_path, fileName),
      formattedContent,
      "utf-8",
    );
  }
}

type BuildDomainsArgs = {
  schema: Schema;
  output_path: string;
  prettier_config: Options | null;
};

async function buildDomains({
  schema,
  output_path,
  prettier_config,
}: BuildDomainsArgs): Promise<void> {
  await mkdir(output_path, { recursive: true });

  const files = await DomainsBuilder.build({
    schema,
  });

  for (const [fileName, content] of Object.entries(files)) {
    const formattedContent = await prettierFormat(content, prettier_config);
    await writeFile(
      path.join(output_path, fileName),
      formattedContent,
      "utf-8",
    );
  }
}

type BuildRangesArgs = {
  schema: Schema;
  output_path: string;
  prettier_config: Options | null;
};

async function buildRanges({
  schema,
  output_path,
  prettier_config,
}: BuildRangesArgs): Promise<void> {
  await mkdir(output_path, { recursive: true });

  const files = await RangesBuilder.build({
    schema,
  });

  for (const [fileName, content] of Object.entries(files)) {
    const formattedContent = await prettierFormat(content, prettier_config);
    await writeFile(
      path.join(output_path, fileName),
      formattedContent,
      "utf-8",
    );
  }
}
