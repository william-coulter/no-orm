#!/usr/bin/env node

const { extractSchemas } = await import("extract-pg-schema");
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { Command } from "commander";
import { TableDetails } from "extract-pg-schema";

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

        await writeFile(
          path.join(outputPath, "table.ts"),
          tableFileContent,
          "utf-8",
        );

        const modelFileContent = await ModelBuilder.build({});

        await writeFile(
          path.join(outputPath, "model.ts"),
          modelFileContent,
          "utf-8",
        );
      }
    }

    // For each schema.
    // For each table.
    //  1. Create `table.ts`.
    //  2. Create `model.ts`.
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
