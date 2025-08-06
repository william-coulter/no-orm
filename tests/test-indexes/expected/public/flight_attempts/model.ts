import { type CommonQueryMethods, sql } from "slonik";
import {
  type Id,
  type Row,
  aliasColumns,
  columnsFragment,
  row,
  tableFragment,
} from "./table";
import { type Row as PenguinsRow } from "../penguins/table";

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
}: GetManyByPenguinArgs): Promise<Map<PenguinsRow["id"], Row>> {
  const rows = await getManyByPenguin({ connection, columns });
  return new Map<PenguinsRow["id"], Row>(rows.map((row) => [row.penguin, row]));
}
