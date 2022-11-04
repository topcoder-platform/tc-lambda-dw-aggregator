import { ParquetSchema } from "parquets";

export const challengeTrackSchema = new ParquetSchema({
  id: { type: "UTF8" },
  abbreviation: { type: "UTF8" },
  isActive: { type: "BOOLEAN" },
  name: { type: "UTF8" },
});
