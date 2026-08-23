import { z } from "zod";

export const currencyCode = z.string().brand<"billing.domains.currency_code">();
