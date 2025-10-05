import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { Options } from "prettier";

import * as PostgresBuilder from "../builders/postgres.builder";

import { prettierFormat } from "../commands/generate";

export async function parse({
  prettier_config,
  output_path,
}: ParseArgs): Promise<void> {
  await mkdir(output_path, {
    recursive: true,
  });

  await mkdir(output_path, { recursive: true });

  const files = await PostgresBuilder.build();

  for (const [fileName, content] of Object.entries(files)) {
    const formattedContent = await prettierFormat(content, prettier_config);
    await writeFile(
      path.join(output_path, fileName),
      formattedContent,
      "utf-8",
    );
  }
}

// Right now this content is pretty static however it might use DB context at some point.
type ParseArgs = {
  prettier_config: Options | null;
  output_path: string;
};
