import { z } from "zod";

export namespace Schemas {
  export const textShort = z.string().brand<"public.domains.text_short">();
}

export namespace Types {
  export type TextShort = z.infer<typeof Schemas.textShort>;
}
