# TODO List:

- Test more types.
- Test enums, domain, composite, range.
- Test NULL-ability.
- Test readonly and omitted columns.
- Test foreign keys.
- Test indexes.
- Add logger (warn on unknown types, add loading spinner).
- Address all `TODO`s / `FIXME`s in the code.

# No ORM!

Generate type-safe Slonik / Zod interfaces and access patterns from your PostgreSQL schema.

# Motivation

**We hate ORMs.**

Well we don't _"hate"_ them but they have their pros and cons.

Object-relational mappings are an **abstraction** over whatever database engine you are using. Abstractions work by hiding implementation details which makes using your database simpler, but also harder to understand and deeply configure. **You gain simplicity but lose control**.

Our opinion is that PostgreSQL is already a great abstraction. It's a centuries-old cathedral: carefully designed, continuously maintained, and still standing strong thanks to a dedicated community of builders. Adding another layer on top often just obscures the craftsmanship and limits its potential.

We recognise however that ORMs do have their benefits when writing and maintaining server code.

**The motivation of `No ORM` is to capture all of the best bits of an ORM while also preserving what makes PostgreSQL so great.**

# What do we not like about ORMs?

1. Database schemas written by ORMs suck.

It's not their fault. They abstract over what is already a beautiful tool for defining schemas which means they miss out on the

Working with ORMs such as [Active Record](https://guides.rubyonrails.org/active_record_migrations.html) or [TypeORM](https://typeorm.io/migrations), we find ourselves wanting more.

_"How can I define a Postgres enum type?"_
_"How can I enforce data integrity with a deferred constraint trigger?"_
_"TODO: Another one."_

2. N + 1 query problems everywhere.

While ORMs encourage simple query patterns, this also means they encourage round trips to the DB.

<!-- Maybe talk about how activerecord's "includes" is actually a really nice solution to this. -->

3. It's harder (or sometimes impossible) to use PostgreSQL's amazing features.

4. Portability is not an advantage.

# So what are the best bits of an ORM?

## No hand-written SQL

Writing raw SQL to manage database access patterns, especially with basic CRUD operations, is just painful.

```typescript
// This query is so simple, why do I have to hand-write it?!
const sql = `
    SELECT column_1, column_2,...
    FROM random_entity_number_50
    WHERE id = $1`;
...
```

```typescript
// My query has so many parameters embed in a plain string!
// I hope I don't make a mistake!
const sql = `
    INSERT INTO table_with_many_columns (
        column_1,
        ...
        column_35
    ) VALUES (
        $1,
        ...
        $35
    )`;
...
```

Having an ORM certainly takes the pain out of querying and writing rows to your DB.

```typescript
// *sigh of relief*
const applicationCodeRepresentation: SomeORMEntity = new SomeORMEntity({ ...args });
await applicationCodeRepresentation.save();
...
```

## Application code that represents your entities

If I have the database table `penguins`:

```sql
CREATE TABLE penguins (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    can_fly     BOOLEAN NOT NULL DEFAULT FALSE,
    lives_in    INT NOT NULL REFERENCES locations(id)
);
```

The fact that an ORM gives me some representation of a row of this table in my code is fantastic and saves a lot of boilerplate.

```typescript
type Penguin = {
  id: number;
  name: string;
  can_fly: boolean;
  lives_in: Location;
};

const localPenguins: Penguin[] = Penguin.where({ lives_in: "my_home" });
// Returns `[]`.
```

## They encourage simple data access patterns.

We find that in server code that uses raw SQL, there tends to be a lot of `JOIN`s:

```typescript
const sql = `
    SELECT alias_1.col_1, alias_2.col_2,...
    FROM table_1 alias_1
    JOIN table_2 alias_2 ON alias_2.id = alias_1.id
    LEFT JOIN table_3 alias_3 ON alias_3.id = alias_2.id
    WHERE table_3.id IS NOT NULL
      AND table_1.col_1 = 'something'`;
```

Understanding the data that comes back from this query is incredibly difficult. Not only that, but even a well-indexed query like this is not performant. The Postgres database is happiest when it processes simple queries. Even a few `JOIN`s with a `WHERE` clause can cause the query planner to get things wrong and blow up your query execution time. Even though we don't like ORMs, we also don't like complicated SQL queries.

Note that this isn't an explicit benefit of using an ORM however ORMs encourage the developer to perform simple queries.

All of these are fantastic benefits of an ORM and **using `No ORM` will give you these too!**

# Philosophy

In any application server, you should be able to manage your PostgreSQL database engine using all of the bells and whistles that have been added to PostgreSQL since the 1980s without having to write boilerplate code.

With a traditional ORM, you start by writing application code and the ORM will create the database schema. With No ORM, you start by writing the schema and then **we give you the application code!**

<!-- DIAGRAM -->

# Other arguments for using an ORM and why these reasons are bad

<!-- DO THIS AT THE END. -->

This reddit discussion is pretty good: https://www.reddit.com/r/AskProgramming/comments/1gaw39x/why_would_you_ever_use_an_orm/?rdt=34875

- Portability.
- Query building (just do server side joins). Built queries are often inefficient.
-

Our problem with ORM abstractions (at least with PostgreSQL) is that they are already incredibly robust tools that abstract ; they don't need more abstraction.

# How no-ORM is different to:

## ORMs

(The philosophy above).

## Things like Knex

(You still write your own SQL schema).

# The ORM burn manifesto

A list of behaviours from various ORMs that we think are heinous and should not exist but there is no way around them.

<!-- DO THIS AT THE END. -->
<!-- Set up a website with Starlight (and a nice theme): https://starlight-theme-rapide.vercel.app/getting-started/ -->

<!-- NEW SECTION - Developer guide. -->

# Introduction

1. Write your PostgreSQL schema in raw SQL, giving you full control over what your database tables look like.

- Use any `Postgres` type you want.
- Write any table constraints that you want.
- Write any database triggers that you want.
- Define any column types.

2. Define a config file.

3. Run `No ORM` on your database.

4. Enjoy all of the free application code provided by yours truly!

# Example

# How it works
