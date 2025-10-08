import { Files } from "./types";

type BuildArgs = {};

export async function build({}: BuildArgs): Promise<Files> {
  return {
    "type-parsers.ts": buildTypeParsers(),
  };
}

export function buildTypeParsers(): string {
  return `import { default as parseInterval, type IPostgresInterval } from "postgres-interval";
import { type DriverTypeParser } from "slonik";

/**
 * \`no-orm\` makes some opinionated decisions about what Postgres values
 * should be parsed to what Typescript type. These are some parsers that
 * must be included in your Slonik config for \`no-orm\` to work.
 *
 * For more on Slonik \`typeParsers\`, see [here](https://github.com/gajus/slonik?tab=readme-ov-file#default-type-parsers).
 * Also include Slonik's \`createTypeParserPreset\`.
 */
export const requiredTypeParsers: DriverTypeParser[] = [
  ...createDateLikeParsers(),
  createIntervalParser(),
];

/**
 * A \`no-orm\` opinionated way to parse date-like types from Postgres into Javascript.
 *
 * By default Slonik parses these as \`numbers\`. This is because Javascript date objects
 * ignore microseconds whereas Postgres types have this. See discussion [here](https://github.com/gajus/slonik/issues/113#issuecomment-546042594).
 *
 * While this is a valid design choice, in most cases it's just easier to use \`Date\`
 * so \`no-orm\` will use this.
 */
function createDateLikeParsers(): DriverTypeParser<Date>[] {
  return [
    {
      name: "timestamptz",
      parse: (value) => {
        return new Date(value);
      },
    },
    {
      name: "timestamp",
      parse: (value) => {
        return new Date(value);
      },
    },
  ];
}

/**
 * An interceptor to parse the Postgres \`interval\` type into an \`IPostgresInterval\`.
 */
function createIntervalParser(): DriverTypeParser<IPostgresInterval> {
  return {
    name: "interval",
    parse: (value) => {
      return parseInterval(value);
    },
  };
}
`;
}
