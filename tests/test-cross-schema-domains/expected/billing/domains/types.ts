import { z } from "zod";
import * as Schemas from "./schemas";

export type CurrencyCode = z.infer<typeof Schemas.currencyCode>;
