/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ParquetReader, ParquetSchema, ParquetWriter } from "parquets";
import {
  submissionSchema,
  challengeSchema,
  challengeTimelineTemplateSchema,
  challengeTrackSchema,
  challengeTypeSchema,
  resourceRoleSchema,
  resourceSchema,
} from "src/schema";
import { TEMP_FOLDER } from "src/conf";

const readPq = async (fileContent: Buffer[][]): Promise<any> => {
  const pqContent: any = [];
  await Promise.all(
    fileContent.map(async (fileGroup: Buffer[], index: number) => {
      pqContent[index] = [];
      await Promise.all(
        fileGroup.map(async (file: Buffer, index2: number) => {
          const reader = await ParquetReader.openBuffer(file);
          const cursor = reader.getCursor();
          let row = await cursor.next();
          const tempFile = [];
          while (row) {
            tempFile.push(row);
            row = await cursor.next();
          }
          if (!pqContent[index]) pqContent[index] = [];
          pqContent[index][index2] = tempFile;
        })
      );
    })
  );
  return pqContent;
};
const convertToPq = async (packed: any, schema: string): Promise<void> => {
  let pqSchema: ParquetSchema;
  switch (schema) {
    case "submission":
      pqSchema = submissionSchema;
      break;
    case "challenge":
      pqSchema = challengeSchema;
      break;
    case "challengeTimelineTemplate":
      pqSchema = challengeTimelineTemplateSchema;
      break;
    case "challengeTrack":
      pqSchema = challengeTrackSchema;
      break;
    case "challengeType":
      pqSchema = challengeTypeSchema;
      break;
    case "resourceRole":
      pqSchema = resourceRoleSchema;
      break;
    case "resource":
      pqSchema = resourceSchema;
      break;
    default:
      throw new Error("Invalid schema");
  }

  await Promise.all(
    packed.map(async (items: any, index: number) => {
      const writer = await ParquetWriter.openFile(pqSchema, `${TEMP_FOLDER}/${schema}-${index}.parquet`);
      await Promise.all(
        items.map(async (item: any) => await writer.appendRow(item))
      );
      await writer.close();
    })
  );
};

export { convertToPq, readPq };
