import { z } from "zod";
import * as Schemas from "./schemas";

export type StockLevel = z.infer<typeof Schemas.stockLevel>;
