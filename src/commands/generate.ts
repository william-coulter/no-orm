import type { Schema } from "extract-pg-schema";
import { mkdir, rename, rm, writeFile } from "fs/promises";
import path from "path";
import { format, type Options, resolveConfig } from "prettier";

import * as SlonikBuilder from "../builders/slonik.builder";
import { noOrmConfigSchema } from "../config";
import * as DefaultConfigs from "../config/default";
import * as ConfigParser from "../config/parser";
import * as logger from "../logger";
import * as PostgresParser from "../parsers/postgres.parser";
import * as SchemaParser from "../parsers/schema.parser";
import { withLoadingSpinner } from "./helpers/with-loading-spinner";

const extractSchemaMod = await import("extract-pg-schema");
const extractSchemasModule =
  extractSchemaMod.extractSchemas ?? extractSchemaMod.default?.extractSchemas;

export async function run(args: RunArgs): Promise<void> {
  await withLoadingSpinner({
    action: () => doRun(args),
  });
}

type RunArgs = {
  configPath: string;
};

async function doRun({ configPath }: RunArgs): Promise<void> {
  const fullPathToConfig = path.isAbsolute(configPath)
    ? configPath
    : path.join(process.cwd(), configPath);

  const configModule = await importConfig(fullPathToConfig);
  const config = noOrmConfigSchema.parse(configModule.default ?? configModule);
  const postgresConnectionString =
    ConfigParser.parsePostgresConnectionString(config);

  const schemas = await extractSchemas(postgresConnectionString);

  const parsedConfig = ConfigParser.parse(config, schemas);

  // IDEA: This can be a config argument.
  const prettierConfig = await resolveConfig(".prettierrc");
  const codeFormatter = buildFormatter(prettierConfig);

  const tempOutputDirectoryPath = buildTempOutputDirectoryPath();

  try {
    // Write main output directory.
    await mkdir(parsedConfig.output_directory, {
      recursive: true,
    });
    // Write temporary directory.
    await mkdir(tempOutputDirectoryPath, {
      recursive: true,
    });

    await generate({
      schemas,
      schema_config: parsedConfig,
      code_formatter: codeFormatter,
      output_path: tempOutputDirectoryPath,
    });

    // Move temp to the actual output.
    // IDEA: This operation should be atomic.
    await rm(parsedConfig.output_directory, {
      recursive: true,
    });
    await rename(tempOutputDirectoryPath, parsedConfig.output_directory);
  } catch (err) {
    console.error("Error:", err);
    await rm(tempOutputDirectoryPath, {
      recursive: true,
    });
    process.exit(1);
  }
}

/** Does the thing that `no-orm` advertises on the box. */
async function generate({
  schemas,
  schema_config,
  code_formatter,
  output_path,
}: GenerateArgs): Promise<void> {
  await PostgresParser.parse({
    code_formatter,
    output_path: path.join(output_path, "postgres"),
  });

  const slonikOutputDirectory = path.join(output_path, "slonik");
  await mkdir(slonikOutputDirectory, {
    recursive: true,
  });
  const slonikFiles = await SlonikBuilder.build();
  for (const [fileName, content] of Object.entries(slonikFiles)) {
    const formattedContent = await code_formatter(content);
    await writeFile(
      path.join(slonikOutputDirectory, fileName),
      formattedContent,
      "utf-8",
    );
  }

  for (const schema of Object.values(schemas)) {
    const schemaConfig =
      schema_config.database_schema_config.schema_configs.get(schema.name) ??
      DefaultConfigs.parsedSchemaConfig;

    if (schemaConfig.ignore === true) {
      logger.debug(`Schema '${schema.name}' is ignored, skipping...`);
      continue;
    }

    await SchemaParser.parse({
      schema: schema,
      output_path: output_path,
      config: schemaConfig,
      code_formatter,
    });
  }
}

type GenerateArgs = {
  schemas: Record<string, Schema>;
  schema_config: ConfigParser.ParsedConfig;
  code_formatter: (code: string) => Promise<string>;
  output_path: string;
};

/** Returns a formatter function that will format code using a prettier config. */
export function buildFormatter(
  config: Options | null,
): (code: string) => Promise<string> {
  return async (code) => format(code, { parser: "typescript", config });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importConfig(path: string): Promise<any> {
  try {
    return await import(path);
  } catch (e) {
    logger.error(`Could not import config file ${path}.`);
    if (e instanceof Error) {
      logger.error(e.message);
    }
    process.exit(1);
  }
}

async function extractSchemas(
  postgresConnectionString: string,
): Promise<Record<string, Schema>> {
  try {
    return await extractSchemasModule({
      connectionString: postgresConnectionString,
    });
  } catch (e) {
    logger.error(
      `Could not extract schemas from DB ${postgresConnectionString}`,
    );
    if (e instanceof Error) {
      logger.error(e.message);
    }
    process.exit(1);
  }
}

/**
 * Builds a temporary directory for generated code to live until it is committed.
 *
 * This directory should not clash with anything that the user has defined.
 */
function buildTempOutputDirectoryPath(): string {
  const jitter = Math.random()
    .toString(36)
    .slice(2, 2 + 4);

  return `.no-orm-build-${jitter}`;
}
