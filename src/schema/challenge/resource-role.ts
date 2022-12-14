import { ParquetSchema } from "parquets";

export const resourceRoleSchema = new ParquetSchema({
  id: { type: "UTF8" },
  fullReadAccess: { type: "BOOLEAN", optional: true },
  fullWriteAccess: { type: "BOOLEAN", optional: true },
  isActive: { type: "BOOLEAN", optional: true },
  legacyId: { type: "INT64", optional: true },
  name: { type: "UTF8", optional: true },
  nameLower: { type: "UTF8", optional: true },
  selfObtainable: { type: "BOOLEAN", optional: true },
});
