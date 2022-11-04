import { ParquetSchema } from "parquets";

export const resourceSchema = new ParquetSchema({
  id: { type: "UTF8" },
  challengeId: { type: "UTF8" },
  created: { type: "TIMESTAMP_MILLIS", optional: true },
  createdBy: { type: "UTF8", optional: true },
  legacyId: {
    optional: true,
    type: "INT64",
  },
  memberHandle: {
    optional: true,
    type: "UTF8",
  },
  memberId: {
    optional: true,
    type: "INT64",
  },
  roleId: {
    optional: true,
    type: "UTF8",
  },
  updated: { type: "TIMESTAMP_MILLIS", optional: true },
  updatedBy: { type: "UTF8", optional: true },
});
