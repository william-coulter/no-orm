import chalk from "chalk";
import inquirer from "inquirer";

import { writeFile } from "fs/promises";

import * as logger from "../logger";
import { withLoadingSpinner } from "./helpers/with-loading-spinner";

export async function run({}: RunArgs): Promise<void> {
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

    await withLoadingSpinner({
      action: () => buildEmptyConfig(configPath),
      spinnerText: `Building config at ${configPath}`,
      failureMessage: `Cannot build config at ${configPath}`,
      successMessage: `Built config at ${configPath}`,
    });

    console.log();
    console.log(`To get started, run:`);
    console.log(
      chalk.bgBlue.white(`no-orm generate --config-path ${configPath}`),
    );

    const logo = getLogoForWidth(process.stdout.columns);
    console.log(chalk.blue(logo));
  } catch (e) {
    logger.error(`Could not init no-orm: ${e}`);
    process.exit(1);
  }
}

type RunArgs = {};

async function buildEmptyConfig(path: string): Promise<void> {
  const emptyConfig = `import { NoOrmConfig } from "no-orm";

const config: NoOrmConfig = {};

export default config;
`;

  await writeFile(path, emptyConfig);
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
