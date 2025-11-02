import { Schema, TableDetails } from "extract-pg-schema";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import * as logger from "../logger";
import * as TableParser from "./table.parser";
import { ParsedSchemaConfig } from "../config/parser";
import * as DefaultConfigs from "../config/default";
import * as EnumsBuilder from "../builders/enums.builder";
import * as DomainsBuilder from "../builders/domains.builder";
import * as RangesBuilder from "../builders/ranges.builder";
import { snakeToPascalCase } from "../builders/helpers";

export async function parse({
  schema,
  output_path,
  config,
  code_formatter,
}: ParseArgs): Promise<void> {
  const schemaOutputPath = path.join(output_path, schema.name);
  await mkdir(schemaOutputPath, {
    recursive: true,
  });

  await buildEnums({
    schema,
    output_path: path.join(schemaOutputPath, "enums"),
    code_formatter,
  });

  await buildDomains({
    schema,
    output_path: path.join(schemaOutputPath, "domains"),
    code_formatter,
  });

  await buildRanges({
    schema,
    output_path: path.join(schemaOutputPath, "ranges"),
    code_formatter,
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
      output_path: path.join(schemaOutputPath, "tables"),
      code_formatter: code_formatter,
    });
  }

  await buildTableIndex({
    tables: schema.tables,
    config: config,
    output_path: path.join(schemaOutputPath, "tables/index.ts"),
    code_formatter,
  });

  await buildIndex({
    output_path: path.join(schemaOutputPath, "index.ts"),
    code_formatter,
  });
}

type ParseArgs = {
  schema: Schema;
  output_path: string;
  config: NonIgnoredConfig;
  code_formatter: (raw: string) => Promise<string>;
};

export type NonIgnoredConfig = Extract<ParsedSchemaConfig, { ignore?: false }>;

type BuildEnumsArgs = {
  schema: Schema;
  output_path: string;
  code_formatter: (raw: string) => Promise<string>;
};

async function buildEnums({
  schema,
  output_path,
  code_formatter,
}: BuildEnumsArgs): Promise<void> {
  await mkdir(output_path, { recursive: true });

  const files = await EnumsBuilder.build({
    schema,
  });

  for (const [fileName, content] of Object.entries(files)) {
    const formattedContent = await code_formatter(content);
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
  code_formatter: (raw: string) => Promise<string>;
};

async function buildDomains({
  schema,
  output_path,
  code_formatter,
}: BuildDomainsArgs): Promise<void> {
  await mkdir(output_path, { recursive: true });

  const files = await DomainsBuilder.build({
    schema,
  });

  for (const [fileName, content] of Object.entries(files)) {
    const formattedContent = await code_formatter(content);
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
  code_formatter: (raw: string) => Promise<string>;
};

async function buildRanges({
  schema,
  output_path,
  code_formatter,
}: BuildRangesArgs): Promise<void> {
  await mkdir(output_path, { recursive: true });

  const files = await RangesBuilder.build({
    schema,
  });

  for (const [fileName, content] of Object.entries(files)) {
    const formattedContent = await code_formatter(content);
    await writeFile(
      path.join(output_path, fileName),
      formattedContent,
      "utf-8",
    );
  }
}

type BuildTableIndexArgs = {
  tables: TableDetails[];
  output_path: string;
  config: NonIgnoredConfig;
  code_formatter: (raw: string) => Promise<string>;
};

async function buildTableIndex({
  tables,
  config,
  code_formatter,
  output_path,
}: BuildTableIndexArgs): Promise<void> {
  const content = tables
    .map(({ name }) => {
      if (config.table_configs.get(name)?.ignore === true) {
        return null;
      }

      const pascalCase = snakeToPascalCase(name);
      return `export * as ${pascalCase} from "./${name}"`;
    })
    .filter((s) => s !== null)
    .join(";\n");

  const formattedContent = await code_formatter(content);
  await writeFile(output_path, formattedContent, "utf-8");
}

type BuildIndexArgs = {
  output_path: string;
  code_formatter: (raw: string) => Promise<string>;
};

async function buildIndex({
  output_path,
  code_formatter,
}: BuildIndexArgs): Promise<void> {
  const content = [
    `export * as Domains from "./domains"`,
    `export * as Enums from "./enums"`,
    `export * as Ranges from "./ranges"`,
    `export * as Tables from "./tables"`,
  ].join(";\n");

  const formattedContent = await code_formatter(content);
  await writeFile(output_path, formattedContent, "utf-8");
}
