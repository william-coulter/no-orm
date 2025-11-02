import chalk from "chalk";

export function info(message: string): void {
  console.info(chalk.blue(message));
}

export function warn(message: string): void {
  console.warn(chalk.yellow(`[WARN]: ${message}`));
}

export function error(message: string): void {
  console.error(chalk.red(`[ERROR]: ${message}`));
}

export function debug(message: string): void {
  console.debug(chalk.grey(message));
}
