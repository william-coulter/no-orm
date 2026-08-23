import { z } from "zod";

export const stockLevel = z.number().brand<"inventory.domains.stock_level">();
