import { ParquetSchema } from 'parquets'

export const schema = new ParquetSchema({
  id: { type: "UTF8" },
  isDefault: { type: "BOOLEAN" },
  timelineTemplateId: { type: "UTF8" },
  trackId: { type: "UTF8" },
  typeId: { type: "UTF8" },
});

