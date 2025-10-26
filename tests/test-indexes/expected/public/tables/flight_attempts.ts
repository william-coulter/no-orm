import { z } from "zod";
import { type CommonQueryMethods, type ListSqlToken, sql } from "slonik";
import { type Row as PenguinsRow } from "../tables/penguins";

export const row = z.object({
  id: z.number().brand<"public.flight_attempts.id">(),
  penguin: z.number().brand<"public.penguins.id">(),
  method: z.string(),
  attempted_at: z.date(),
  altitude_cm: z.number(),
  success: z.boolean(),
  failure_reason: z.string().nullable(),
});

export type Row = z.infer<typeof row>;

export type Id = Row["id"];

export const tableFragment = sql.identifier(["public", "flight_attempts"]);

export const columns = Object.keys(row.shape).map((col) =>
  sql.identifier([col]),
);

export const columnsFragment = sql.join(columns, sql.fragment`, `);

export function aliasColumns(alias: string): ListSqlToken {
  const aliasedColumns = Object.keys(row.shape).map((col) =>
    sql.identifier([alias, col]),
  );

  return sql.join(aliasedColumns, sql.fragment`, `);
}

type BaseArgs = { connection: CommonQueryMethods };

export type Create = {
  penguin: PenguinsRow["id"];
  method: string;
  attempted_at: Date;
  altitude_cm: number;
  success: boolean;
  failure_reason: string | null;
};

export type CreateManyArgs = BaseArgs & { shapes: Create[] };

export async function createMany({
  connection,
  shapes,
}: CreateManyArgs): Promise<readonly Row[]> {
  const tuples = shapes.map((shape) => [
    shape.penguin,
    shape.method,
    shape.attempted_at.toISOString(),
    shape.altitude_cm,
    shape.success,
    shape.failure_reason,
  ]);

  const query = sql.type(row)`
    INSERT INTO ${tableFragment} (
      penguin,
      method,
      attempted_at,
      altitude_cm,
      success,
      failure_reason
    )
    SELECT penguin, method, attempted_at, altitude_cm, success, failure_reason
    FROM ${sql.unnest(tuples, ["int4", "text", "timestamptz", "int4", "bool", "text"])}
      AS input(penguin, method, attempted_at, altitude_cm, success, failure_reason)
    RETURNING ${columnsFragment}`;

  return connection.any(query);
}

export type CreateArgs = BaseArgs & { shape: Create };

export async function create({ connection, shape }: CreateArgs): Promise<Row> {
  const result = await createMany({ connection, shapes: [shape] });
  return result[0];
}

export type GetManyArgs = BaseArgs & { ids: Id[] };

export async function getMany({
  connection,
  ids,
}: GetManyArgs): Promise<readonly Row[]> {
  const query = sql.type(row)`
    SELECT ${columnsFragment}
    FROM ${tableFragment}
    WHERE id = ANY(${sql.array(ids, "int4")})`;

  return connection.any(query);
}

type GetArgs = BaseArgs & { id: Id };

export async function get({ connection, id }: GetArgs): Promise<Row> {
  const result = await getMany({ connection, ids: [id] });
  return result[0];
}

export async function getManyMap({
  connection,
  ids,
}: GetManyArgs): Promise<Map<Id, Row>> {
  const rows = await getMany({ connection, ids });
  return new Map<Id, Row>(rows.map((row) => [row.id, row]));
}

export type FindManyArgs = BaseArgs & { ids: number[] };

export async function findMany({
  connection,
  ids,
}: FindManyArgs): Promise<readonly Row[]> {
  return getMany({ connection, ids: ids as Id[] });
}

export type FindArgs = BaseArgs & { id: number };

export async function find({ connection, id }: FindArgs): Promise<Row | null> {
  const result = await findMany({ connection, ids: [id] });
  return result[0] ?? null;
}

export type Update = {
  penguin: PenguinsRow["id"];
  method: string;
  attempted_at: Date;
  altitude_cm: number;
  success: boolean;
  failure_reason: string | null;
} & { id: Id };

export type UpdateManyArgs = BaseArgs & { newRows: Update[] };

export function updateMany({
  connection,
  newRows,
}: UpdateManyArgs): Promise<readonly Row[]> {
  const tuples = newRows.map((newRow) => [
    newRow.id,
    newRow.penguin,
    newRow.method,
    newRow.attempted_at.toISOString(),
    newRow.altitude_cm,
    newRow.success,
    newRow.failure_reason,
  ]);

  const query = sql.type(row)`
    UPDATE ${tableFragment} AS t SET
      penguin = input.penguin,
      method = input.method,
      attempted_at = input.attempted_at,
      altitude_cm = input.altitude_cm,
      success = input.success,
      failure_reason = input.failure_reason
    FROM ${sql.unnest(tuples, [
      "int4",
      "int4",
      "text",
      "timestamptz",
      "int4",
      "bool",
      "text",
    ])} AS input(id, penguin, method, attempted_at, altitude_cm, success, failure_reason)
    WHERE t.id = input.id
    RETURNING ${aliasColumns("t")}`;

  return connection.any(query);
}

type UpdateArgs = BaseArgs & { newRow: Update };

export async function update({ connection, newRow }: UpdateArgs): Promise<Row> {
  const result = await updateMany({ connection, newRows: [newRow] });
  return result[0];
}

export type DeleteManyArgs = BaseArgs & { ids: Id[] };

export async function deleteMany({
  connection,
  ids,
}: DeleteManyArgs): Promise<void> {
  const query = sql.type(row)`
    DELETE FROM ${tableFragment}
    WHERE id = ANY(${sql.array(ids, "int4")})`;

  await connection.query(query);
}

type DeleteArgs = BaseArgs & { id: Id };

async function _delete({ connection, id }: DeleteArgs): Promise<void> {
  await deleteMany({ connection, ids: [id] });
}

export { _delete as delete };

export type GetManyByPenguinArgs = BaseArgs & {
  columns: PenguinsRow["id"][];
};

export async function getManyByPenguin({
  connection,
  columns,
}: GetManyByPenguinArgs): Promise<readonly Row[]> {
  const list = columns.map((col) => col);
  return connection.any(sql.type(row)`
    SELECT ${columnsFragment}
    FROM ${tableFragment}
    WHERE penguin = ANY(${sql.array(list, "int4")})`);
}

export type GetByPenguinArgs = BaseArgs & {
  penguin: PenguinsRow["id"];
};

export async function getByPenguin({
  connection,
  penguin,
}: GetByPenguinArgs): Promise<readonly Row[]> {
  const result = await getManyByPenguin({ connection, columns: [penguin] });
  return result;
}

export async function getManyByPenguinMap({
  connection,
  columns,
}: GetManyByPenguinArgs): Promise<Map<PenguinsRow["id"], Row[]>> {
  const rows = await getManyByPenguin({ connection, columns });
  const map = new Map<PenguinsRow["id"], Row[]>(
    columns.map((penguin) => [penguin, []]),
  );
  for (const row of rows) {
    const existing = map.get(row.penguin)!;
    map.set(row.penguin, [...existing, row]);
  }
  return map;
}

export type GetManyByPenguinAndMethod = BaseArgs & {
  columns: {
    penguin: PenguinsRow["id"];
    method: string;
  }[];
};

export async function getManyByPenguinAndMethod({
  connection,
  columns,
}: GetManyByPenguinAndMethod): Promise<readonly Row[]> {
  const tuples = columns.map((col) => [col.penguin, col.method]);

  const query = sql.type(row)`
    SELECT ${aliasColumns("t")}
    FROM ${tableFragment} AS t
    JOIN ${sql.unnest(tuples, ["int4", "text"])} AS input(penguin, method)
      ON  input.penguin = t.penguin
      AND input.method = t.method`;

  return connection.any(query);
}

export type GetByPenguinAndMethod = BaseArgs & {
  penguin: PenguinsRow["id"];
  method: string;
};

export async function getByPenguinAndMethod({
  connection,
  penguin,
  method,
}: GetByPenguinAndMethod): Promise<Row | null> {
  const result = await getManyByPenguinAndMethod({
    connection,
    columns: [
      {
        penguin,
        method,
      },
    ],
  });

  return result[0] ?? null;
}
