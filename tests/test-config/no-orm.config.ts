import { join } from "path";

import { NoOrmConfig } from "../../src/config";

const config: NoOrmConfig = {
  // For testing, the Postgres container host is dynamic.
  postgres_connection_string: process.env.POSTGRES_CONNECTION_STRING ?? "",
  // For testing, we want the output directory to be dynamic.
  output_directory: join(process.env.OUTPUT_DIRECTORY ?? "", "custom-path"),

  database_schema_config: {
    schema_configs: {
      public: {
        table_configs: {
          penguins: {
            column_configs: {
              // FIXME: Make this automatic unless specified otherwise.
              created_at: { readonly: true },
              updated_at: { readonly: true },
              ignore_column: { ignore: true },
            },
          },
          flight_attempts: {
            column_configs: {
              created_at: { readonly: true },
              updated_at: { readonly: true },
            },
          },
          ignore_table: { ignore: true },
        },
      },
    },
  },
};

export default config;
