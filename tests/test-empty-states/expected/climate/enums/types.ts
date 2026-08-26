import { z } from "zod";
import * as Schemas from "./schemas";

export type Condition = z.infer<typeof Schemas.condition>;
