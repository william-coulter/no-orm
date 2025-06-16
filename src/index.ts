#!/usr/bin/env node

const { extractSchemas } = await import("extract-pg-schema");
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { Command } from "commander";
import { format, resolveConfig, type Options } from "prettier";

import { noOrmConfigSchema } from "./no-orm.config";
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

    const result = await extractSchemas({
      connectionString: config.postgres_connection_string,
    });

    const schemas = Object.keys(result);

    for (const schema of schemas) {
      const schemaOutputPath = path.join(config.output_directory, schema);
      await mkdir(schemaOutputPath, {
        recursive: true,
      });

      const tables = result[schema].tables;

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
