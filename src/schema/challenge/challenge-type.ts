import { ParquetSchema } from "parquets";

export const challengeTypeSchema = new ParquetSchema({
  id: { type: "UTF8" },
  abbreviation: { type: "UTF8" },
  description: { type: "UTF8" },
  isActive: { type: "BOOLEAN" },
  isTask: { type: "BOOLEAN" },
  name: { type: "UTF8" },
});
