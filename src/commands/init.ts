import chalk from "chalk";
import { writeFile } from "fs/promises";
import inquirer from "inquirer";
import { createSpinner } from "nanospinner";

import * as logger from "../logger";

export async function run(): Promise<void> {
  try {
    console.log(chalk.bgBlue.white("Welcome to no-orm!"));
    console.log();

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "configPath",
        message: "Where would you like to store your config file?",
        default: "no-orm.config.ts",
      },
    ]);

    const { configPath } = answers;

    const spinner = createSpinner(`Building config at ${configPath}`);

    try {
      spinner.start();
      await buildEmptyConfig(configPath);
      spinner.success(`Built config at ${configPath}`);
    } catch (e) {
      spinner.error(`Cannot build config at ${configPath}: ${e}`);
      process.exit(1);
    }

    console.log();
    console.log(`To get started, run:`);
    console.log(
      chalk.bgBlue.white(`no-orm generate --config-path ${configPath}`),
    );

    const terminalWidth = process.stdout.columns;
    const logo = getLogoForWidth(terminalWidth);
    const centredLogo = center(logo, terminalWidth);
    console.log(chalk.blue(centredLogo));
  } catch (e) {
    logger.error(`Could not init no-orm: ${e}`);
    process.exit(1);
  }
}

async function buildEmptyConfig(path: string): Promise<void> {
  const emptyConfig = `import type { NoOrmConfig } from "no-orm";

const config: NoOrmConfig = {
  postgres_connection_string:
    process.env.NO_ORM_POSTGRES_CONNECTION_STRING ??
    "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable",
};

export default config;
`;

  await writeFile(path, emptyConfig);
}

function center(text: string, width: number) {
  return text
    .split("\n")
    .map((line) => {
      const pad = Math.max(0, Math.floor((width - line.length) / 2));
      return " ".repeat(pad) + line;
    })
    .join("\n");
}

function getLogoForWidth(width: number): string {
  if (width < 50) {
    return logoSmall;
  } else {
    return logoLarge;
  }
}

const logoLarge = `
            @@@@@@@@@@
          @@@@@@@@@@@@@@@
        @@%+===*%%%*+===%@
       @%-%%***%@@@@#***%@@
       @@@%. -%-%#%#. =%.#@@
       @#*@:.+=#@%%@*:=::%@
       @@#=*%%@%+===*@%%*+%
       @@@#   =@%@@@@%- .%@
      @@@@@*:  .=*#=.  :%@@@
     @@@@@@+. .       ..=@@@@
   @@@@@@@=    . .  .    =@@@@@
  @@@@@@@*  ..   .  .  ...*@@@@
 @@@@@@@@:    .   .  .    =@@@@@
 @@@@@@@#...  . .  .  .  .:@@@@@@
@@@@@@@@#.  .   .  .  .  .:@@@@@@
@@@@@@@@%:  .  .  .  .  . =@@@@@@
@@  @@@@@= .  .  .  .  . :#@@  @@
     @@@@@=  .  .  .  . .#@@
      @@@@@%-.  .  . .:*@@@
       @@@@@@@@#***#%@@@%@@@@
     @@*==+*%@@@@@@@%*+====+%@
     @@**=====%@    @@@#**%@@@
       @@@@@@@@@        @@@
`;

const logoSmall = `
    @@@@@@
  @@+-*%-=%@
   @++#+#+#@
  @@%..-.:@@
 @@@:.....:@@
@@@#.......%@@
@@@@......:@@
  @@@=:::#@
  %+=+@ @*+@
`;
