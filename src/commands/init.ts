import * as logger from "../logger";

export async function run({}: RunArgs): Promise<void> {
  logger.info("Welcome to `no-orm`!");
}

type RunArgs = {};
