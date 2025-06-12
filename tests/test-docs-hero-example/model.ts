import { type CommonQueryMethods, sql } from "slonik";
import {
  columnsFragment,
  type Id,
  row,
  type Row,
  tableFragment,
} from "./expected/public/penguins/table";

type BaseArgs = { connection: CommonQueryMethods };

export type Create = {
  name: string;
  species: string;
  waddle_speed_kph: number;
};

export type CreateManyArgs = BaseArgs & {
  shapes: Create[];
};

export async function createMany({
  connection,
  shapes,
}: CreateManyArgs): Promise<readonly Row[]> {
  const names = shapes.map((shape) => shape.name);
  const species = shapes.map((shape) => shape.species);
  const waddleSpeeds = shapes.map((shape) => shape.waddle_speed_kph);

  const query = sql.type(row)`
    INSERT INTO ${tableFragment} (
      name,
      species,
      waddle_speed_kph
    )
    SELECT ${columnsFragment} FROM ${sql.unnest(
      [names, species, waddleSpeeds],
      ["text", "text", "numeric"],
    )}
    RETURNING ${columnsFragment}`;

  return connection.any(query);
}

export type CreateArgs = BaseArgs & {
  shape: Create;
};

export async function create({ connection, shape }: CreateArgs): Promise<Row> {
  const result = await createMany({ connection, shapes: [shape] });
  return result[0];
}

export type GetManyArgs = BaseArgs & {
  ids: number[];
};

export async function getMany({
  connection,
  ids,
}: GetManyArgs): Promise<readonly Row[]> {
  const query = sql.type(row)`
    SELECT ${columnsFragment}
    FROM ${tableFragment}
    WHERE id = ANY(${sql.array(ids, "INT")})`;

  return connection.any(query);
}

type GetArgs = BaseArgs & {
  id: Id;
};

export async function get({ connection, id }: GetArgs): Promise<Row> {
  const result = await getMany({ connection, ids: [id] });
  return result[0];
}

type Update = Row;

type UpdateArgs = BaseArgs & {
  newRow: Update;
};

export function updateMany({
  connection,
  newRows,
}: UpdateManyArgs): Promise<readonly Row[]> {
  const ids = newRows.map((row) => row.id);
  const names = newRows.map((row) => row.name);
  const species = newRows.map((row) => row.species);
  const waddleSpeeds = newRows.map((row) => row.waddle_speed_kph);

  const query = sql.type(row)`
    UPDATE ${tableFragment} AS t SET
      name = u.name,
      species = u.species,
      waddle_speed_kph = u.waddle_speed_kph
    FROM (
      SELECT * FROM ${sql.unnest(
        [ids, names, species, waddleSpeeds],
        ["id", "text", "text", "numeric"],
      )}
    ) AS u(id, name, species, waddle_speed_kph)
    WHERE t.id = u.id
    RETURNING ${columnsFragment}`;

  return connection.any(query);
}

export async function update({ connection, newRow }: UpdateArgs): Promise<Row> {
  const result = await updateMany({ connection, newRows: [newRow] });
  return result[0];
}

export type UpdateManyArgs = BaseArgs & {
  newRows: Update[];
};

export type DeleteManyArgs = BaseArgs & {
  ids: number[];
};

export async function deleteMany({
  connection,
  ids,
}: GetManyArgs): Promise<void> {
  const query = sql.type(row)`
    DELETE FROM ${columnsFragment}
    WHERE id = ANY(${sql.array(ids, "INT")})`;

  await connection.query(query);
}

type DeleteArgs = BaseArgs & {
  id: Id;
};

// Gross that I need to add "One" here because delete is a reserved word.
export async function deleteOne({ connection, id }: DeleteArgs): Promise<void> {
  await deleteMany({ connection, ids: [id] });
}
