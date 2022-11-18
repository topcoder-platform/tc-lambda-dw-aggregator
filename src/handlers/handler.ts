import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { convertToPq, readPq } from "src/resources/pqProcessor";
import {
  formatS3Files,
  getAllS3Files,
  getFolderList,
  getS3FilesList,
  writeAllToS3,
} from "src/resources/s3FileOpener";
import { cleanTemp } from "src/utils/utils";

const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Event: ", event);
  const { Bucket, Path, MaxSize, Schema } = event.body
    ? JSON.parse(event.body)
    : null;
  if (!Bucket || !Path || !MaxSize || !Schema || !Path.endsWith("/"))
    throw new Error("Missing required parameters");
  //deleting all old files
  await cleanTemp();
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
    body: JSON.stringify({
      filesProcessed: fileList.length,
      filesWritten: sortedFiles.length,
    }),
  };
};

const zipMonthly = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const { Bucket, Path, MaxSize, Schema } = event.body
    ? JSON.parse(event.body)
    : null;
  if (!Bucket || !Path || !MaxSize || !Schema || !Path.endsWith("/"))
    throw new Error("Missing required parameters");

  const data = await getFolderList(Bucket, Path);
  if (data) {
    for (const item of data) {
      await handler(<APIGatewayEvent>{
        body: JSON.stringify({ Bucket, Path: item.Prefix, MaxSize, Schema }),
      });
    }
  }

  return {
    statusCode: 200,
    body: "ok",
  };
};

const zipYearly = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const { Bucket, Path, MaxSize, Schema } = event.body
    ? JSON.parse(event.body)
    : null;
  if (!Bucket || !Path || !MaxSize || !Schema || !Path.endsWith("/"))
    throw new Error("Missing required parameters");

  const data = await getFolderList(Bucket, Path);
  if (data) {
    for (const item of data) {
      console.log(`Processing  Month:${item.Prefix}`);
      await zipMonthly(<APIGatewayEvent>{
        body: JSON.stringify({ Bucket, Path: item.Prefix, MaxSize, Schema }),
      });
    }
  }

  return {
    statusCode: 200,
    body: "ok",
  };
};

const zipAll = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const { Bucket, Path, MaxSize, Schema } = event.body
    ? JSON.parse(event.body)
    : null;
  if (!Bucket || !Path || !MaxSize || !Schema || !Path.endsWith("/"))
    throw new Error("Missing required parameters");

  const data = await getFolderList(Bucket, Path);
  if (data) {
    for (const item of data) {
      console.log(`Processing year: ${item.Prefix}`);
      await zipYearly(<APIGatewayEvent>{
        body: JSON.stringify({ Bucket, Path: item.Prefix, MaxSize, Schema }),
      });
    }
  }

  return {
    statusCode: 200,
    body: "ok",
  };
};

export { handler, zipMonthly, zipYearly, zipAll };
