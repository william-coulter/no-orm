export function build(): string {
  return `${buildImports()}

${buildJsonParser()}`;
}

function buildImports(): string {
  return `import { z } from "zod";`;
}

function buildJsonParser(): string {
  return `const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(jsonValue),
  ])
);`;
}
