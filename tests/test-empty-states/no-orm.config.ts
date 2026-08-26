import { NoOrmConfig } from "../../src/config";

const config: NoOrmConfig = {
  // For testing, the Postgres container host is dynamic.
  postgres_connection_string: process.env.POSTGRES_CONNECTION_STRING ?? "",
  // For testing, we want the output directory to be dynamic.
  output_directory: process.env.OUTPUT_DIRECTORY ?? "",

  database_schema_config: {
    schema_configs: {
      public: {
        table_configs: {
          culled: { ignore: true },
        },
      },
      quarantine: {
        table_configs: {
          isolated: { ignore: true },
        },
      },
    },
  },
};

export default config;
