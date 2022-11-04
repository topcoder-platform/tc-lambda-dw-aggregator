import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { convertToPq, readPq } from "src/resources/pqProcessor";
import {
  formatS3Files,
  getAllS3Files,
  getS3FilesList,
} from "src/resources/s3FileOpener";

const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const { Bucket, Path, MaxSize, Schema } = event.body
    ? JSON.parse(event.body)
    : null;
  if (!Bucket || !Path || !MaxSize || !Schema)
    throw new Error("Missing required parameters");
  //Convert max size to bytes
  const fileList = await getS3FilesList(Bucket, Path);
  const sortedFiles = await formatS3Files(fileList, MaxSize * 1024 * 1024);
  const fileContent = await getAllS3Files(Bucket, sortedFiles);
  const pqContent = await readPq(fileContent);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const packed = pqContent.map((items: any) =>
    items.map((item: any) => item[0])
  );
  await convertToPq(packed, Schema);

  return {
    statusCode: 200,
    body: "done",
  };
};

export { handler };
