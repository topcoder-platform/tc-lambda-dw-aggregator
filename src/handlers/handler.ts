import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  SFNClient, SendTaskHeartbeatCommand,
  SendTaskSuccessCommand, SendTaskFailureCommand
} from "@aws-sdk/client-sfn";
import {
  RedshiftDataClient, ExecuteStatementCommand,
  DescribeStatementCommand
} from "@aws-sdk/client-redshift-data";
import { convertToPq, getSchema, readPq } from "src/resources/pqProcessor";
import {
  formatS3Files,
  getAllS3Files,
  getFolderList,
  getS3FilesList,
  cleanS3,
  writeAllToS3,
  verifyPath,
} from "src/resources/s3FileOpener";

import {
  AWS_REGION_INSTANCE, REDSHIFT_CLUSTER,
  REDSHIFT_DB, REDSHIFT_USER
} from "src/conf";
import { cleanTemp } from "src/utils/utils";

const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const { Bucket, Path, MaxSize, Schema } = (event as APIGatewayEvent).body
    ? JSON.parse((event as APIGatewayEvent).body || '')
    : event;
  if (!Bucket || !Path || !MaxSize || !Schema || !Path.endsWith("/"))
    throw new Error("Missing required parameters");

  try {
    getSchema(Schema);
  } catch (e) {
    return {
      statusCode: 200,
      body: 'Invalid Schema',
    };
  }
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
  const { Bucket, Path, MaxSize, Schema } = (event as APIGatewayEvent).body
    ? JSON.parse((event as APIGatewayEvent).body || '')
    : event;
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
  const { Bucket, Path, MaxSize, Schema } = (event as APIGatewayEvent).body
    ? JSON.parse((event as APIGatewayEvent).body || '')
    : event;
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
  const { Bucket, Path, MaxSize, Schema } = (event as APIGatewayEvent).body
    ? JSON.parse((event as APIGatewayEvent).body || '')
    : event;
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

const calculateDate = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const { Bucket, Path, MaxSize, Schema } = (event as APIGatewayEvent).body
    ? JSON.parse((event as APIGatewayEvent).body || '')
    : event;
  if (!Bucket || !Path || !MaxSize || !Schema || !Path.endsWith("/"))
    throw new Error("Missing required parameters");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = yesterday.getMonth() + 1;
  const day = yesterday.getDate();
  const timePath = `${Path}${year}/${month}/${day}/`;
  await handler(<APIGatewayEvent>{
    body: JSON.stringify({ Bucket, Path: timePath, MaxSize, Schema }),
  });
  return {
    statusCode: 200,
    body: "ok",
  };
}

const runProc = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const { taskToken, flowName } = (event as APIGatewayEvent).body
    ? JSON.parse((event as APIGatewayEvent).body || '')
    : event;
  console.log({ taskToken, flowName })
  // a client can be shared by different commands.
  const awsRedshiftClient = new RedshiftDataClient({
    region: AWS_REGION_INSTANCE
  });

  // a client can be shared by different commands.
  const sfnClient = new SFNClient({
    region: AWS_REGION_INSTANCE
  });
  const params = {
    ClusterIdentifier: REDSHIFT_CLUSTER,
    Database: REDSHIFT_DB,
    DbUser: REDSHIFT_USER,
    Sql: `call edw.procedure_load_control_call_from_source('${flowName}');`,
  }
  const command = new ExecuteStatementCommand(params);
  const executeStatementResult = await awsRedshiftClient.send(command);
  let final = await awsRedshiftClient.send(new DescribeStatementCommand({
    Id: executeStatementResult.Id
  }));
  const sendTaskHeartbeatCommand = new SendTaskHeartbeatCommand({
    taskToken,
  });
  await sfnClient.send(sendTaskHeartbeatCommand);
  while (["PICKED", "STARTED", "SUBMITTED"].includes(final.Status as string)) {
    await sfnClient.send(sendTaskHeartbeatCommand);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await new Promise((r: any) => setTimeout(r, 2000));
    await sfnClient.send(sendTaskHeartbeatCommand);
    console.log(final)
    final = await awsRedshiftClient.send(new DescribeStatementCommand({
      Id: executeStatementResult.Id
    }));
    await sfnClient.send(sendTaskHeartbeatCommand);
  }
  console.log(final);
  if (final.Status === "FINISHED") {
    const sendTaskSuccessCommand = new SendTaskSuccessCommand({
      taskToken,
      output: '{"status":"ok"}'
    })
    await sfnClient.send(sendTaskSuccessCommand);
  } else {
    const sendTaskFailureCommand = new SendTaskFailureCommand({
      taskToken,
      cause: "Failed",
      error: final.Error
    })
    await sfnClient.send(sendTaskFailureCommand);
  }
  return {
    statusCode: 200,
    body: "ok",
  };
}

const removeOldFiles = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const { Bucket, Path } = (event as APIGatewayEvent).body
    ? JSON.parse((event as APIGatewayEvent).body || '')
    : event;
  if (!Bucket || !Path || !Path.endsWith("/"))
    throw new Error("Missing required parameters");
  await cleanS3(Bucket, Path)
  await verifyPath(Bucket, Path)
  return {
    statusCode: 200,
    body: "ok",
  };
}

export { handler, zipMonthly, zipYearly, zipAll, calculateDate, runProc, removeOldFiles };
