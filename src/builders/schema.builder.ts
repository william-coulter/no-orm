import { Schema } from "extract-pg-schema";
import { ParsedSchemaConfig } from "../config/parser";

// FIXME: Move in the schema stuff in here.
export function build({ schema, output_path, config }: ParseArgs): void {}

type ParseArgs = {
  schema: Schema;
  output_path: string;
  config: NonIgnoredConfig;
};

type NonIgnoredConfig = Extract<ParsedSchemaConfig, { ignore: false }>;
