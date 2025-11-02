#!/usr/bin/env node

import { Command } from "commander";

import { version } from "../package.json";
import * as GenerateCommand from "./commands/generate";
import * as InitCommand from "./commands/init";
import * as logger from "./logger";

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
  .action(async (options: {}) => {
    await InitCommand.run(options);
  });

program
  .command("generate")
  .description("Generate models based on Postgres schema")
  .option("--config-path <path>", "Path to the config file", "no-orm.config.ts")
  .action(async (options: { configPath: string }) => {
    await GenerateCommand.run(options);
  });

program.version(version);

program.arguments("<command>").action((cmd) => {
  logger.error(`Unknown command: '${cmd}'`);
  program.outputHelp();
  process.exit(1);
});

if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(1);
} else {
  program.parse(process.argv);
}

export type { NoOrmConfig } from "./config/index";
