import { z } from "zod";

import * as Schemas from "./schemas";

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export type Interval = z.infer<typeof Schemas.interval>;

export type Int4range = z.infer<typeof Schemas.int4range>;

export type Int8range = z.infer<typeof Schemas.int8range>;

export type Numrange = z.infer<typeof Schemas.numrange>;

export type Tsrange = z.infer<typeof Schemas.tsrange>;

export type Tstzrange = z.infer<typeof Schemas.tstzrange>;

export type Daterange = z.infer<typeof Schemas.daterange>;
