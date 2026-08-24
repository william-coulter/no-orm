import { z } from "zod";
import { type CommonQueryMethods, type ListSqlToken, sql } from "slonik";
import * as ColonyDomains from "../../colony/domains";

export const row = z.object({
  id: z.number().brand<"feeding.deliveries.id">(),
  courier: z.string(),
  recipient_band: ColonyDomains.Schemas.bandCode,
});

export type Row = z.infer<typeof row>;

export type Id = Row["id"];

export const tableFragment = sql.identifier(["feeding", "deliveries"]);

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
  courier: string;
  recipient_band: ColonyDomains.Types.BandCode;
};

export type CreateManyArgs = BaseArgs & { shapes: Create[] };

export async function createMany({
  connection,
  shapes,
}: CreateManyArgs): Promise<readonly Row[]> {
  const tuples = shapes.map((shape) => [shape.courier, shape.recipient_band]);

  const query = sql.type(row)`
    INSERT INTO ${tableFragment} (
      courier,
      recipient_band
    )
    SELECT courier, recipient_band
    FROM ${sql.unnest(tuples, [["text"], ["colony", "band_code"]])}
      AS input(courier, recipient_band)
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
  courier: string;
  recipient_band: ColonyDomains.Types.BandCode;
} & { id: Id };

export type UpdateManyArgs = BaseArgs & { newRows: Update[] };

export function updateMany({
  connection,
  newRows,
}: UpdateManyArgs): Promise<readonly Row[]> {
  const tuples = newRows.map((newRow) => [
    newRow.id,
    newRow.courier,
    newRow.recipient_band,
  ]);

  const query = sql.type(row)`
    UPDATE ${tableFragment} AS t SET
      courier = input.courier,
      recipient_band = input.recipient_band
    FROM ${sql.unnest(tuples, [
      ["int4"],
      ["text"],
      ["colony", "band_code"],
    ])} AS input(id, courier, recipient_band)
    WHERE t.id = input.id
    RETURNING ${aliasColumns("t")}`;

  return connection.any(query);
}

export type UpdateArgs = BaseArgs & { newRow: Update };

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

export type DeleteArgs = BaseArgs & { id: Id };

async function _delete({ connection, id }: DeleteArgs): Promise<void> {
  await deleteMany({ connection, ids: [id] });
}

export { _delete as delete };
