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
  favourite_snack: string | null;
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
    shape.favourite_snack,
    shape.date_of_birth.toISOString(),
  ]);

  const query = sql.type(row)`
    INSERT INTO ${tableFragment} (
      name,
      species,
      waddle_speed_kph,
      favourite_snack,
      date_of_birth
    )
    SELECT name, species, waddle_speed_kph, favourite_snack, date_of_birth
    FROM ${sql.unnest(tuples, ["text", "text", "numeric", "text", "timestamptz"])}
      AS input(name, species, waddle_speed_kph, favourite_snack, date_of_birth)
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

export type Update = {
  name: string;
  species: string;
  waddle_speed_kph: number;
  favourite_snack: string | null;
  date_of_birth: Date;
} & { id: Id };

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
    newRow.favourite_snack,
    newRow.date_of_birth.toISOString(),
  ]);

  const query = sql.type(row)`
    UPDATE ${tableFragment} AS t SET
      name = input.name,
      species = input.species,
      waddle_speed_kph = input.waddle_speed_kph,
      favourite_snack = input.favourite_snack,
      date_of_birth = input.date_of_birth
    FROM ${sql.unnest(tuples, [
      "int4",
      "text",
      "text",
      "numeric",
      "text",
      "timestamptz",
    ])} AS input(id, name, species, waddle_speed_kph, favourite_snack, date_of_birth)
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

export type GetManyBySpeciesAndDateOfBirth = BaseArgs & {
  columns: {
    species: string;
    date_of_birth: Date;
  }[];
};

export async function getManyBySpeciesAndDateOfBirth({
  connection,
  columns,
}: GetManyBySpeciesAndDateOfBirth): Promise<readonly Row[]> {
  const tuples = columns.map((col) => [
    col.species,
    col.date_of_birth.toISOString(),
  ]);

  const query = sql.type(row)`
    SELECT ${aliasColumns("t")}
    FROM ${tableFragment} AS t
    JOIN ${sql.unnest(tuples, [
      "text",
      "timestamptz",
    ])} AS input(species, date_of_birth)
      ON  input.species = t.species
      AND input.date_of_birth = t.date_of_birth`;

  return connection.any(query);
}

export type GetBySpeciesAndDateOfBirth = BaseArgs & {
  species: string;
  date_of_birth: Date;
};

export async function getBySpeciesAndDateOfBirth({
  connection,
  species,
  date_of_birth,
}: GetBySpeciesAndDateOfBirth): Promise<readonly Row[]> {
  return getManyBySpeciesAndDateOfBirth({
    connection,
    columns: [
      {
        species,
        date_of_birth,
      },
    ],
  });
}

export type GetManyByNameArgs = BaseArgs & {
  columns: string[];
};

export async function getManyByName({
  connection,
  columns,
}: GetManyByNameArgs): Promise<readonly Row[]> {
  const list = columns.map((col) => col);
  return connection.any(sql.type(row)`
    SELECT ${columnsFragment}
    FROM ${tableFragment}
    WHERE name = ANY(${sql.array(list, "text")})`);
}

export type GetByNameArgs = BaseArgs & {
  name: string;
};

export async function getByName({
  connection,
  name,
}: GetByNameArgs): Promise<Row | null> {
  const result = await getManyByName({ connection, columns: [name] });
  return result[0] ?? null;
}
