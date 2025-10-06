import { z } from "zod";
import { type CommonQueryMethods, type ListSqlToken, sql } from "slonik";

export const row = z.object({
  id: z.number().brand<"public.penguins.id">(),
  name: z.string(),
  species: z.string(),
  waddle_speed_kph: z.number(),
  favourite_snack: z.string().nullable(),
  date_of_birth: z.date(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type Row = z.infer<typeof row>;

export type Id = Row["id"];

export const tableFragment = sql.identifier(["public", "penguins"]);

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

export type GetManyByNameAndSpecies = BaseArgs & {
  columns: {
    name: string;
    species: string;
  }[];
};

export async function getManyByNameAndSpecies({
  connection,
  columns,
}: GetManyByNameAndSpecies): Promise<readonly Row[]> {
  const tuples = columns.map((col) => [col.name, col.species]);

  const query = sql.type(row)`
    SELECT ${aliasColumns("t")}
    FROM ${tableFragment} AS t
    JOIN ${sql.unnest(tuples, ["text", "text"])} AS input(name, species)
      ON  input.name = t.name
      AND input.species = t.species`;

  return connection.any(query);
}

export type GetByNameAndSpecies = BaseArgs & {
  name: string;
  species: string;
};

export async function getByNameAndSpecies({
  connection,
  name,
  species,
}: GetByNameAndSpecies): Promise<Row | null> {
  const result = await getManyByNameAndSpecies({
    connection,
    columns: [
      {
        name,
        species,
      },
    ],
  });

  return result[0] ?? null;
}
