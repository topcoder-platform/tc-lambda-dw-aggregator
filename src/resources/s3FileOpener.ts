/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  S3Client,
  ListObjectsCommand,
  GetObjectCommand,
  ListObjectsCommandOutput,
} from "@aws-sdk/client-s3";
import type { Readable } from "stream";
import { AWS_REGION } from "src/conf";

interface S3FileList {
  Key: string;
  Size: number;
  ETag: string;
  StorageClass: string;
}

const client = new S3Client({
  region: AWS_REGION,
  //TODO:Remove this
  credentials: {
    accessKeyId: <string>process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: <string>process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
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

  // eslint-disable-next-line consistent-return
  const data: Buffer = await new Promise(
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
  Prefix: string
): Promise<S3FileList[]> => {
  const params = {
    Bucket,
    Prefix,
  };
  const ListCommand = new ListObjectsCommand(params);
  const data: ListObjectsCommandOutput = await client.send(ListCommand);
  const objectList = <S3FileList[]>data.Contents;
  if (!objectList) throw new Error("No objects found");
  return objectList;
};

const s3Writer = async (
  Bucket: string,
  Key: string,
  Body: Buffer
): Promise<void> => {};
export { formatS3Files, getS3FilesList, getAllS3Files };
