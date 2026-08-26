/** Serialises a Postgres `Range<T>` into a string that can be stored in the database. */
export function range(value: any): string {
  return value instanceof Date ? value.toISOString() : String(value);
}
