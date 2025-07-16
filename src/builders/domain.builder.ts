import { EnumDetails, Schema } from "extract-pg-schema";
import { snakeToCamelCase, snakeToPascalCase } from "./helpers";
import { enumNameToZodSchemaName } from "./mappers";

type BuildArgs = {
  schema: Schema;
};

export async function build({ schema }: BuildArgs): Promise<string> {
  const imports = buildImports();

  const enums = schema.enums.map(buildEnum);

  return `${imports}
  
${enums.join("\n\n")}`;
}

function buildImports(): string {
  const DEFAULT_IMPORTS: string[] = [`import { z } from "zod"`];

  return DEFAULT_IMPORTS.map((s) => `${s};`).join("\n");
}

function buildEnum(enumDetails: EnumDetails): string {
  const enumName = enumDetails.name;
  const enumZodSchemaName = enumNameToZodSchemaName(enumName);
  const literals = enumDetails.values.map((v) => `z.literal("${v}")`);

  const enumVariable = `export const ${enumZodSchemaName} = z.union([
    ${literals.join(",\n")}
  ])`;

  const enumType = `export type ${snakeToPascalCase(enumName)}Enum = z.infer<typeof ${enumZodSchemaName}>`;
  return `${enumVariable}

${enumType}`;
}
