#!/usr/bin/env node

const { extractSchemas } = await import("extract-pg-schema");
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { Command } from "commander";
import { format, resolveConfig, type Options } from "prettier";

import * as logger from "./logger";
import { noOrmConfigSchema } from "./config";
import * as PostgresBuilder from "./builders/postgres.builder";
import * as SchemaParser from "./parsers/schema.parser";
import * as EmptyConfigs from "./config/empty";
import { parseForDatabase } from "./config/parser";

const program = new Command();

program
  .option("--config-path <path>", "Path to the config file", "no-orm.config.ts")
  .parse(process.argv);

const options = program.opts<{ configPath: string }>();

async function run({ configPath }: RunArgs) {
  try {
    const fullPathToConfig = path.isAbsolute(configPath)
      ? configPath
      : path.join(process.cwd(), configPath);

    const configModule = await import(fullPathToConfig);
    const config = noOrmConfigSchema.parse(
      configModule.default ?? configModule,
    );
    // TODO: Make me a config argument.
    const prettierConfig = await resolveConfig(".prettierrc");

    await mkdir(config.output_directory, {
      recursive: true,
    });

    const postgresPath = path.join(config.output_directory, "postgres.ts");
    const postgresContent = PostgresBuilder.build();
    const formattedPostgresContent = await prettierFormat(
      postgresContent,
      prettierConfig,
    );
    await writeFile(postgresPath, formattedPostgresContent, "utf-8");

    const result = await extractSchemas({
      connectionString: config.postgres_connection_string,
    });

    const parsedDatabaseConfig = parseForDatabase(
      config.database_schema_config,
      result,
    );

    const schemaNames = Object.keys(result);
    for (const schemaName of schemaNames) {
      const schema = result[schemaName];
      const schemaConfig =
        parsedDatabaseConfig.schema_configs.get(schema.name) ??
        EmptyConfigs.parsedSchemaConfig;

      if (schemaConfig.ignore === true) {
        logger.debug(`Schema '${schema.name}' is ignored, skipping...`);
        continue;
      }

      await SchemaParser.parse({
        schema: schema,
        output_path: config.output_directory,
        config: schemaConfig,
        prettier_config: prettierConfig,
      });
    }
  } catch (err) {
    // TODO: On error, ensure any changes made to the `no-orm` directory are left untouched.
    // Basically make sure generating your files is atomic.
    console.error("Error:", err);
    process.exit(1);
  }
}

type RunArgs = {
  configPath: string;
};

run({ configPath: options.configPath });

/** Will format the file according to the prettier config. */
// FIXME: Format the entire `no-orm` directory once at the end.
export async function prettierFormat(
  code: string,
  config: Options | null,
): Promise<string> {
  return format(code, { parser: "typescript", config });
}
