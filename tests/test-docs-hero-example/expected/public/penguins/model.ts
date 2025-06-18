import { type CommonQueryMethods, sql } from "slonik";
import {
  type Id,
  type Row,
  columnsFragment,
  row,
  tableFragment,
} from "./table";

type BaseArgs = { connection: CommonQueryMethods };

export type Create = {
  name: string;
  species: string;
  waddle_speed_kph: number;
};

export type CreateManyArgs = BaseArgs & { shapes: Create[] };

export async function createMany({
  connection,
  shapes,
}: CreateManyArgs): Promise<readonly Row[]> {
  const name_shapes = shapes.map((shape) => shape.name);
  const species_shapes = shapes.map((shape) => shape.species);
  const waddle_speed_kph_shapes = shapes.map((shape) => shape.waddle_speed_kph);

  const query = sql.type(row)`
    INSERT INTO ${tableFragment} (
      name,
      species,
      waddle_speed_kph
    )
    SELECT ${columnsFragment} FROM ${sql.unnest(
      [name_shapes, species_shapes, waddle_speed_kph_shapes],
      ["text", "text", "numeric"],
    )}
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
    WHERE id = ANY(${sql.array(ids, "int")})`;

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
  const ids = newRows.map((row) => row.id);
  const name_updates = newRows.map((row) => row.name);
  const species_updates = newRows.map((row) => row.species);
  const waddle_speed_kph_updates = newRows.map((row) => row.waddle_speed_kph);

  const query = sql.type(row)`
    UPDATE ${tableFragment} AS t SET
      name = u.name,
      species = u.species,
      waddle_speed_kph = u.waddle_speed_kph
    FROM (
      SELECT ${columnsFragment} FROM ${sql.unnest(
        [ids, name_updates, species_updates, waddle_speed_kph_updates],
        ["int", "text", "text", "numeric"],
      )}
    ) AS u(id, name, species, waddle_speed_kph)
    WHERE t.id = u.id
    RETURNING ${columnsFragment}`;

  return connection.any(query);
}

type UpdateArgs = BaseArgs & { newRow: Update };

export async function update({ connection, newRow }: UpdateArgs): Promise<Row> {
  const result = await updateMany({ connection, newRows: [newRow] });
  return result[0];
}
