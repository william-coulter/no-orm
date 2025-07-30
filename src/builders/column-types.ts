import { TableColumn, TableColumnType } from "extract-pg-schema";

// The `TableColumn` isn't defined as a discriminative union since the structure
// doesn't change based on the type. That's fine but I often make certain assumptions
// about the column type in function arguments so I have this file.

export type BaseColumn = TableColumn & {
  type: TableColumnType & { kind: "base" };
};

export type RangeColumn = TableColumn & {
  type: TableColumnType & { kind: "range" };
};

export type DomainColumn = TableColumn & {
  type: TableColumnType & { kind: "domain" };
};

export type CompositeColumn = TableColumn & {
  type: TableColumnType & { kind: "composite" };
};

export type EnumColumn = TableColumn & {
  type: TableColumnType & { kind: "enum" };
};

export function isBaseColumn(column: TableColumn): column is BaseColumn {
  return column.type.kind === "base";
}

export function isRangeColumn(column: TableColumn): column is RangeColumn {
  return column.type.kind === "range";
}

export function isDomainColumn(column: TableColumn): column is DomainColumn {
  return column.type.kind === "domain";
}

export function isCompositeColumn(
  column: TableColumn,
): column is CompositeColumn {
  return column.type.kind === "composite";
}

export function isEnumColumn(column: TableColumn): column is EnumColumn {
  return column.type.kind === "enum";
}
