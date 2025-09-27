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
import * as DefaultConfigs from "./config/default";
import * as ConfigParser from "./config/parser";

const program = new Command();

program
  .name("no-orm")
  .description(
    "Generate type-safe Slonik / Zod interfaces and access patterns from your PostgreSQL schema.",
  )
  .usage("<command> [options]");

program
  .command("init")
  .description("Initialize `no-orm` in your project.")
  .action(async () => {
    logger.info("Welcome to `no-orm`!");
  });

program
  .command("generate")
  .description("Generate models based on Postgres schema")
  .option("--config-path <path>", "Path to the config file", "no-orm.config.ts")
  .action(async (options: { configPath: string }) => {
    await runGenerate(options);
  });

program.arguments("<command>").action((cmd) => {
  logger.error(`Unknown command: '${cmd}'`);
  program.outputHelp();
  process.exitCode = 1;
});

if (process.argv.length <= 2) {
  program.outputHelp();
  process.exitCode = 1;
} else {
  program.parse(process.argv);
}

async function runGenerate({ configPath }: RunArgs) {
  try {
    const fullPathToConfig = path.isAbsolute(configPath)
      ? configPath
      : path.join(process.cwd(), configPath);

    const configModule = await import(fullPathToConfig);
    const config = noOrmConfigSchema.parse(
      configModule.default ?? configModule,
    );
    const postgresConnectionString =
      ConfigParser.parsePostgresConnectionString(config);

    const schemas = await extractSchemas({
      connectionString: postgresConnectionString,
    });

    const parsedConfig = ConfigParser.parse(config, schemas);

    // TODO: Make me a config argument.
    const prettierConfig = await resolveConfig(".prettierrc");

    await mkdir(parsedConfig.output_directory, {
      recursive: true,
    });

    const postgresPath = path.join(
      parsedConfig.output_directory,
      "postgres.ts",
    );
    const postgresContent = PostgresBuilder.build();
    const formattedPostgresContent = await prettierFormat(
      postgresContent,
      prettierConfig,
    );
    await writeFile(postgresPath, formattedPostgresContent, "utf-8");

    for (const schema of Object.values(schemas)) {
      const schemaConfig =
        parsedConfig.database_schema_config.schema_configs.get(schema.name) ??
        DefaultConfigs.parsedSchemaConfig;

      if (schemaConfig.ignore === true) {
        logger.debug(`Schema '${schema.name}' is ignored, skipping...`);
        continue;
      }

      await SchemaParser.parse({
        schema: schema,
        output_path: parsedConfig.output_directory,
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

/** Will format the file according to the prettier config. */
// FIXME: Format the entire `no-orm` directory once at the end.
export async function prettierFormat(
  code: string,
  config: Options | null,
): Promise<string> {
  return format(code, { parser: "typescript", config });
}
