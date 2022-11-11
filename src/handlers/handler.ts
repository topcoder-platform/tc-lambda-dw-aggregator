import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { convertToPq, readPq } from "src/resources/pqProcessor";
import fs from 'fs'
import {
  formatS3Files,
  getAllS3Files,
  getS3FilesList,
  writeAllToS3
} from "src/resources/s3FileOpener";

const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const { Bucket, Path, MaxSize, Schema } = event.body
    ? JSON.parse(event.body)
    : null;
  if (!Bucket || !Path || !MaxSize || !Schema)
    throw new Error("Missing required parameters");
  //deleting all old files
  fs.rmSync('./tmp', { recursive: true, force: true });
  //Convert max size to bytes
  const fileList = await getS3FilesList(Bucket, Path);
  const sortedFiles = await formatS3Files(fileList, MaxSize * 1024 * 1024);
  const fileContent = await getAllS3Files(Bucket, sortedFiles);
  const pqContent = await readPq(fileContent);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const packed = pqContent.map((items: any) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items.map((item: any) => item[0])
  );
  await convertToPq(packed, Schema);
  await writeAllToS3(Path);

  return {
    statusCode: 200,
    body: "done",
  };
};

export { handler };
