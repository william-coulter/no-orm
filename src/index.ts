#!/usr/bin/env node

const { extractSchemas } = await import("extract-pg-schema");
import { noOrmConfigSchema } from "./no-orm.config";
import path from "path";
import { Command } from "commander";

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
      connectionString: config.database_url,
    });

    console.log(
      result.public.tables.map((t) =>
        console.log("found table!", JSON.stringify(t, null, 2)),
      ),
    );
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

type RunArgs = {
  configPath: string;
};

run({ configPath: options.configPath });
