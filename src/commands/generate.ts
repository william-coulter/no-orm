import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { format, resolveConfig, type Options } from "prettier";

import * as logger from "../logger";
import { noOrmConfigSchema } from "../config";
import * as PostgresBuilder from "../builders/postgres.builder";
import * as SchemaParser from "../parsers/schema.parser";
import * as DefaultConfigs from "../config/default";
import * as ConfigParser from "../config/parser";

const extractSchemaMod = await import("extract-pg-schema");
const extractSchemas =
  extractSchemaMod.extractSchemas ?? extractSchemaMod.default?.extractSchemas;

export async function run({ configPath }: RunArgs): Promise<void> {
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
