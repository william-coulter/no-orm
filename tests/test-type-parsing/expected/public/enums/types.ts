import { z } from "zod";
import * as Schemas from "./schemas";

export type MyEnum = z.infer<typeof Schemas.myEnum>;
