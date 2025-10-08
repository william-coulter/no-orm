import {
  createPool,
  createTypeParserPreset,
  DatabasePool,
  DriverTypeParser,
  type Interceptor,
  type QueryResultRow,
  SchemaValidationError,
} from "slonik";

type CreatePoolArgs = {
  type_parsers: DriverTypeParser[];
};

export async function createDatabasePool({
  type_parsers,
}: CreatePoolArgs): Promise<DatabasePool> {
  return createPool(process.env.POSTGRES_CONNECTION_STRING ?? "", {
    interceptors: [createResultParserInterceptor()],
    typeParsers: [...createTypeParserPreset(), ...type_parsers],
  });
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
