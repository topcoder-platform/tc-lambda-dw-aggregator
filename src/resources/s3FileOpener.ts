/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  S3Client,
  ListObjectsCommand,
  GetObjectCommand,
  ListObjectsCommandOutput,
  PutObjectCommand,
  CreateBucketCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import type { Readable } from "stream";
import { AWS_DW_RAW_BUCKET, AWS_REGION_INSTANCE, TEMP_FOLDER } from "src/conf";

interface S3FileList {
  Key: string;
  Size: number;
  ETag: string;
  StorageClass: string;
}

const client = new S3Client({
  region: AWS_REGION_INSTANCE,
});

const formatS3Files = async (
  objectList: S3FileList[],
  MaxSize: number
): Promise<{ Key: string }[][]> => {
  let size = 0;
  let i = 0;
  const files: { Key: string; index: number }[] = [];
  objectList.forEach((item: S3FileList) => {
    size += item.Size ? item.Size : 0;
    if (size > MaxSize) {
      size = item.Size;
      i++;
    }
    files.push({ Key: item.Key, index: i });
  });
  const sortedFiles: { Key: string }[][] = []; //Array of arrays of files
  files.forEach((item: { Key: string; index: number }) => {
    if (!sortedFiles[item.index]) sortedFiles[item.index] = [];
    sortedFiles[item.index].push({ Key: item.Key });
  });
  return sortedFiles;
};

const getAllS3Files = async (
  Bucket: string,
  sortedFiles: { Key: string }[][]
): Promise<Buffer[][]> => {
  const fileContent: Buffer[][] = [];
  await Promise.all(
    sortedFiles.map(async (fileGroup: { Key: string }[], index: number) => {
      fileContent[index] = [];
      await Promise.all(
        fileGroup.map(async (file: { Key: string }, index2: number) => {
          const res = await getFileContents(Bucket, file.Key);
          fileContent[index][index2] = res;
        })
      );
    })
  );
  return fileContent;
};
const getFileContents = async (
  Bucket: string,
  Key: string
): Promise<Buffer> => {
  const getObjectCommand = new GetObjectCommand({
    Bucket,
    Key,
  });
  const response = await client.send(getObjectCommand);

  const data: Buffer = await new Promise(
    // eslint-disable-next-line consistent-return
    (resolve: Function, reject: Function) => {
      try {
        // Store all of data chunks returned from the response data stream
        // into an array then use Buffer.concat to use the returned contents as a Buffer
        const responseDataChunks: Buffer[] = [];
        // Handle an error while streaming the response body
        (response.Body as Readable).on("error", (err: Error) => reject(err));

        // Attach a 'data' listener to add the chunks of data to our array
        // Each chunk is a Buffer instance
        (response.Body as Readable).on("data", (chunk: Buffer) =>
          responseDataChunks.push(chunk)
        );

        // Once the stream has no more data, join the chunks into a Buffer and return the Buffer
        (response.Body as Readable).on("end", () =>
          resolve(Buffer.concat(responseDataChunks))
        );
      } catch (err) {
        // Handle the error or throw
        return reject(err);
      }
    }
  );
  return data;
};

const getS3FilesList = async (
  Bucket: string,
  Prefix: string,
  pqList: boolean = true
): Promise<S3FileList[]> => {
  const params = {
    Bucket,
    Prefix,
    Marker: "",
  };
  // Declare truncated as a flag that the while loop is based on.
  let truncated = true;
  // Declare a variable to which the key of the last element is assigned to in the response.
  let pageMarker;
  // while loop that runs until 'response.truncated' is false.
  let objectList: S3FileList[] = [];
  while (truncated) {
    try {
      const ListCommand = new ListObjectsCommand(params);
      const data: ListObjectsCommandOutput = await client.send(ListCommand);
      objectList.push(...(data.Contents as S3FileList[]));
      // Log the key of every item in the response to standard output.
      truncated = <boolean>data.IsTruncated;
      // If truncated is true, assign the key of the last element in the response to the pageMarker variable.
      if (truncated && data.Contents) {
        pageMarker = data.Contents.slice(-1)[0].Key;
        // Assign the pageMarker value to bucketParams so that the next iteration starts from the new pageMarker.
        params.Marker = <string>pageMarker;
      }
      // At end of the list, response.truncated is false, and the function exits the while loop.
    } catch (err) {
      truncated = false;
    }
  }
  if (pqList) {
    objectList = objectList.filter((item: S3FileList) => item.Key.endsWith(".parquet"));
  }
  return objectList || [];
};

const s3Writer = async (
  Bucket: string,
  Key: string,
  Body: Buffer
): Promise<void> => {
  const params = {
    Bucket,
    Key,
    Body,
  };
  const command = new PutObjectCommand(params);
  await client.send(command);
};
const cleanS3 = async (Bucket: string, Key: string): Promise<void> => {
  const filesToDelete = await getS3FilesList(Bucket, Key, false);
  const Objects = filesToDelete.map((item: S3FileList) => ({ Key: item.Key }));
  if (Objects.length === 0) return;
  const command = new DeleteObjectsCommand({ Bucket, Delete: { Objects } });
  await client.send(command);
};
const writeAllToS3 = async (Path: string): Promise<void> => {
  const command = new CreateBucketCommand({ Bucket: AWS_DW_RAW_BUCKET });
  await client.send(command);
  const files = fs.readdirSync(TEMP_FOLDER);
  await cleanS3(AWS_DW_RAW_BUCKET, Path);
  await Promise.all(
    files.map(async (file: string) => {
      const data = fs.readFileSync(`${TEMP_FOLDER}/${file}`);
      await s3Writer(AWS_DW_RAW_BUCKET, `${Path}${file}`, data);
    })
  );
};

const getFolderList = async (Bucket: string, Prefix: string): Promise<any> => {
  const command = new ListObjectsCommand({ Bucket, Prefix, Delimiter: "/" });
  const data = await client.send(command);
  return data.CommonPrefixes;
};

const verifyPath = async (Bucket: string, Prefix: string): Promise<any> => {
  const command = new PutObjectCommand({ Bucket, Key: Prefix });
  await client.send(command);
}
export {
  formatS3Files,
  getS3FilesList,
  getAllS3Files,
  s3Writer,
  writeAllToS3,
  getFolderList,
  cleanS3,
  verifyPath,
};
