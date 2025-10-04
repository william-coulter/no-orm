import { z } from "zod";
import * as Schemas from "./schemas";

export type TextShort = z.infer<typeof Schemas.textShort>;
