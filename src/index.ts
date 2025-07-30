#!/usr/bin/env node

const { extractSchemas } = await import("extract-pg-schema");
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { Command } from "commander";
import { format, resolveConfig, type Options } from "prettier";

import { noOrmConfigSchema } from "./no-orm.config";
import * as PostgresBuilder from "./builders/postgres.builder";
import * as EnumsBuilder from "./builders/enums.builder";
import * as DomainsBuilder from "./builders/domains.builder";
import * as RangesBuilder from "./builders/ranges.builder";
import * as TableBuilder from "./builders/table.builder";
import * as ModelBuilder from "./builders/model.builder";

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

    const schemaNames = Object.keys(result);
    for (const schemaName of schemaNames) {
      const schema = result[schemaName];

      const schemaOutputPath = path.join(config.output_directory, schemaName);
      await mkdir(schemaOutputPath, {
        recursive: true,
      });

      const enumsContent = await EnumsBuilder.build({
        schema,
      });
      const formattedEnumsContent = await prettierFormat(
        enumsContent,
        prettierConfig,
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
        prettierConfig,
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
        prettierConfig,
      );
      await writeFile(
        path.join(schemaOutputPath, "ranges.ts"),
        formattedRangesContent,
        "utf-8",
      );

      const tables = schema.tables;
      for (const table of tables) {
        const outputPath = path.join(schemaOutputPath, table.name);
        await mkdir(outputPath, {
          recursive: true,
        });

        const tableFileContent = await TableBuilder.build({
          table,
        });

        const formattedTableFileContent = await prettierFormat(
          tableFileContent,
          prettierConfig,
        );

        await writeFile(
          path.join(outputPath, "table.ts"),
          formattedTableFileContent,
          "utf-8",
        );

        const modelFileContent = await ModelBuilder.build({
          table,
        });

        const formattedModelFileContent = await prettierFormat(
          modelFileContent,
          prettierConfig,
        );

        await writeFile(
          path.join(outputPath, "model.ts"),
          formattedModelFileContent,
          "utf-8",
        );
      }
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
async function prettierFormat(
  code: string,
  config: Options | null,
): Promise<string> {
  return format(code, { parser: "typescript", config });
}
