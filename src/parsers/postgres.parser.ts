import { mkdir, writeFile } from "fs/promises";
import path from "path";

import * as PostgresBuilder from "../builders/postgres.builder";

export async function parse({
  output_path,
  code_formatter,
}: ParseArgs): Promise<void> {
  await mkdir(output_path, {
    recursive: true,
  });

  await mkdir(output_path, { recursive: true });

  const files = await PostgresBuilder.build();

  for (const [fileName, content] of Object.entries(files)) {
    const formattedContent = await code_formatter(content);
    await writeFile(
      path.join(output_path, fileName),
      formattedContent,
      "utf-8",
    );
  }
}

// Right now this content is pretty static however it might use DB context at some point.
type ParseArgs = {
  output_path: string;
  code_formatter: (raw: string) => Promise<string>;
};
