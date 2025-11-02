import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { format, resolveConfig, type Options } from "prettier";

import * as logger from "../logger";
import { noOrmConfigSchema } from "../config";
import * as PostgresParser from "../parsers/postgres.parser";
import * as SchemaParser from "../parsers/schema.parser";
import * as DefaultConfigs from "../config/default";
import * as ConfigParser from "../config/parser";
import * as SlonikBuilder from "../builders/slonik.builder";
import type { Schema } from "extract-pg-schema";

const extractSchemaMod = await import("extract-pg-schema");
const extractSchemasModule =
  extractSchemaMod.extractSchemas ?? extractSchemaMod.default?.extractSchemas;

export async function run({ configPath }: RunArgs): Promise<void> {
  try {
    const fullPathToConfig = path.isAbsolute(configPath)
      ? configPath
      : path.join(process.cwd(), configPath);

    const configModule = await importConfig(fullPathToConfig);
    const config = noOrmConfigSchema.parse(
      configModule.default ?? configModule,
    );
    const postgresConnectionString =
      ConfigParser.parsePostgresConnectionString(config);

    const schemas = await extractSchemas(postgresConnectionString);

    const parsedConfig = ConfigParser.parse(config, schemas);

    // TODO: Make me a config argument.
    const prettierConfig = await resolveConfig(".prettierrc");

    await mkdir(parsedConfig.output_directory, {
      recursive: true,
    });

    await PostgresParser.parse({
      prettier_config: prettierConfig,
      output_path: path.join(parsedConfig.output_directory, "postgres"),
    });

    const slonikOutputDirectory = path.join(
      parsedConfig.output_directory,
      "slonik",
    );
    await mkdir(slonikOutputDirectory, {
      recursive: true,
    });
    const slonikFiles = await SlonikBuilder.build({});
    for (const [fileName, content] of Object.entries(slonikFiles)) {
      const formattedContent = await prettierFormat(content, prettierConfig);
      await writeFile(
        path.join(slonikOutputDirectory, fileName),
        formattedContent,
        "utf-8",
      );
    }

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
// FIXME: Pass me in as an argument.
export async function prettierFormat(
  code: string,
  config: Options | null,
): Promise<string> {
  return format(code, { parser: "typescript", config });
}

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
