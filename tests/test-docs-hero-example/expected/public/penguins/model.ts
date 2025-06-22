import { type CommonQueryMethods, sql } from "slonik";
import {
  type Id,
  type Row,
  aliasColumns,
  columnsFragment,
  row,
  tableFragment,
} from "./table";

type BaseArgs = { connection: CommonQueryMethods };

export type Create = {
  name: string;
  species: string;
  waddle_speed_kph: number;
  date_of_birth: Date;
};

export type CreateManyArgs = BaseArgs & { shapes: Create[] };

export async function createMany({
  connection,
  shapes,
}: CreateManyArgs): Promise<readonly Row[]> {
  const tuples = shapes.map((shape) => [
    shape.name,
    shape.species,
    shape.waddle_speed_kph,
    shape.date_of_birth.toISOString(),
  ]);

  const query = sql.type(row)`
    INSERT INTO ${tableFragment} (
      name,
      species,
      waddle_speed_kph,
      date_of_birth
    )
    SELECT name, species, waddle_speed_kph, date_of_birth
    FROM ${sql.unnest(tuples, ["text", "text", "numeric", "timestamptz"])}
      AS input(name, species, waddle_speed_kph, date_of_birth)
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

type Update = Row;

export type UpdateManyArgs = BaseArgs & { newRows: Update[] };

export function updateMany({
  connection,
  newRows,
}: UpdateManyArgs): Promise<readonly Row[]> {
  const tuples = newRows.map((newRow) => [
    newRow.id,
    newRow.name,
    newRow.species,
    newRow.waddle_speed_kph,
    newRow.date_of_birth.toISOString(),
  ]);

  const query = sql.type(row)`
    UPDATE ${tableFragment} AS t SET
      name = input.name,
      species = input.species,
      waddle_speed_kph = input.waddle_speed_kph,
      date_of_birth = input.date_of_birth
    FROM ${sql.unnest(tuples, [
      "int4",
      "text",
      "text",
      "numeric",
      "timestamptz",
    ])} AS input(id, name, species, waddle_speed_kph, date_of_birth)
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
