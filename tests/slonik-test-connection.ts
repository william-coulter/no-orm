import {
  createPool,
  createTypeParserPreset,
  DriverTypeParser,
  type Interceptor,
  type QueryResultRow,
  SchemaValidationError,
} from "slonik";

export const pool = await createPool(
  process.env.POSTGRES_CONNECTION_STRING ?? "",
  {
    interceptors: [createResultParserInterceptor()],
    typeParsers: [...createTypeParserPreset(), ...dateLikeParsers()],
  },
);

/**
 * A `no-orm` opinionated way to parse date-like types from Postgres into Javascript.
 *
 * By default Slonik parses these as `numbers`. This is because Javascript date objects
 * ignore microseconds whereas Postgres types have this. See discussion [here](https://github.com/gajus/slonik/issues/113#issuecomment-546042594).
 *
 * While this is a valid design choice, in most cases it's just easier to use `Date`
 * so `no-orm` will use this.
 */
function dateLikeParsers(): DriverTypeParser<Date>[] {
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
 * An interceptor to parse our types returned from the DB.
 *
 * Copied from: https://github.com/gajus/slonik?tab=readme-ov-file#result-parser-interceptor
 */
function createResultParserInterceptor(): Interceptor {
  return {
    transformRow: async (executionContext, actualQuery, row) => {
      const { resultParser } = executionContext;

      if (!resultParser) {
        return row;
      }

      const validationResult = await resultParser.safeParseAsync(row);

      if (!validationResult.success) {
        throw new SchemaValidationError(
          actualQuery,
          row,
          validationResult.error.issues,
        );
      }

      return validationResult.data as QueryResultRow;
    },
  };
}
