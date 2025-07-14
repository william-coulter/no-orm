import { ColumnReference, TableColumn } from "extract-pg-schema";

/**
 * Converts a snake_case string into PascalCase.
 * E.g. "flight_attempts_log" -> "FlightAttemptsLog"
 */
export function snakeToPascalCase(s: string, join: string = ""): string {
  return s
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(join);
}

/**
 * Converts a snake_case string into camelCase.
 * E.g. "flight_attempts_log" -> "flightAttemptsLog"
 */
export function snakeToCamelCase(s: string): string {
  const pascal = snakeToPascalCase(s);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function getColumnReference(
  column: TableColumn,
): ColumnReference | null {
  if (column.references.length === 0) {
    return null;
  }

  // I guess this is an array because it's technically valid SQL to add multiple FK constraints to the same column.
  // See commit here: https://github.com/kristiandupont/extract-pg-schema/commit/571427c177e97676508302090710306ae29c1170
  // Let's just care about the first one.
  return column.references[0];
}
