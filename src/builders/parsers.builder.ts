export function build(): string {
  return `${buildImports()}

${buildJsonParser()}`;
}

function buildImports(): string {
  return `import { z } from "zod";`;
}

function buildJsonParser(): string {
  return `export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValue: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(jsonValue),
  ]),
);
`;
}
