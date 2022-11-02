/* eslint-disable @typescript-eslint/no-explicit-any */
import { S3Client, ListObjectsCommand, GetObjectCommand, S3 } from '@aws-sdk/client-s3';
import type { Readable } from 'stream'
import { ParquetReader } from 'parquets'
import { AWS_REGION } from 'src/conf';

const client = new S3Client({
  region: AWS_REGION,
});

export const getPqFiles = async (): Promise<any> => {
  const params = {
    Bucket: 'tc-dw-dev-dw-raw',
    Prefix: 'Submission/submission/2019/10/10/'
  };
  const ListCommand = new ListObjectsCommand(params);
  const data = await client.send(ListCommand)
  console.log(data.Contents ? data.Contents[0] : 'No data')
  const fileName = data.Contents ? data.Contents[0].Key : 'No data'

  // eslint-disable-next-line no-async-promise-executor
  const data2: Buffer[] = await new Promise(async (resolve, reject) => {
    const getObjectCommand = new GetObjectCommand({
      Bucket: 'tc-dw-dev-dw-raw',
      Key: fileName
    });
    try {
      const response = await client.send(getObjectCommand)

      // Store all of data chunks returned from the response data stream 
      // into an array then use Array#join() to use the returned contents as a String
      const responseDataChunks: Buffer[] = [];
      // Handle an error while streaming the response body
      (response.Body as Readable).on('error', (err: Error) => reject(err));

      // Attach a 'data' listener to add the chunks of data to our array
      // Each chunk is a Buffer instance
      (response.Body as Readable).on('data', (chunk: Buffer) => responseDataChunks.push(chunk));

      // Once the stream has no more data, join the chunks into a string and return the string
      (response.Body as Readable).on('end', () => resolve(responseDataChunks))
    } catch (err) {
      // Handle the error or throw
      return reject(err)
    }
  })

  const reader = await ParquetReader.openBuffer(Buffer.concat(data2))
  const cursor = reader.getCursor()
  let record = await cursor.next();
  const tempData = [];
  while (record) {
    console.log(record)
    tempData.push(record)
    record = await cursor.next();
  }
  return data2

  // const getObjectCommand = new GetObjectCommand({
  //   Bucket: 'tc-dw-dev-dw-raw',
  //   Key: fileName
  // });
  // const data3: any = await client.send(getObjectCommand);
  // // Convert the ReadableStream to a string.
  // const val = await data3.body
  // console.log(val)
  // const reader = await ParquetReader.openBuffer(val)
  // const cursor = reader.getCursor()
  // let record = await cursor.next();
  // const tempData = [];
  // while (record) {
  //   console.log(record)
  //   tempData.push(record)
  //   record = await cursor.next();
  // }
  // return data3.Body

  //   const getObjectCommand = new GetObjectCommand({
  //     Bucket: 'tc-dw-dev-dw-raw',
  //     Key: fileName
  //   });
  // const file = await client.getObject({
  //   Bucket: 'tc-dw-dev-dw-raw',
  //   Key: fileName
  // })
  // return file;
}