import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda"
import { ParquetReader } from 'parquets'
import fs from 'fs'
import { getPqFiles } from "src/resources/s3FileOpener"

const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  await getPqFiles()
  // const names = fs.readdirSync('./src/pqFiles')
  // const data = await Promise.all(names.map(async (name: string) => {
  //   const tempData = [];
  //   const reader = await ParquetReader.openFile('./src/pqFiles/' + name)
  //   const cursor = reader.getCursor()
  //   let record = await cursor.next();
  //   while (record) {
  //     tempData.push(record)
  //     record = await cursor.next();
  //   }
  //   return tempData

  // }))
  // console.log(data)
  // console.log(`Data is :`, JSON.stringify(data, null, 4))
  // console.log(s3data)
  // const reader = await ParquetReader.openBuffer(s3data)
  // const cursor = reader.getCursor()
  // let record = await cursor.next();
  // const tempData = [];
  // while (record) {
  //   console.log(record)
  //   tempData.push(record)
  //   record = await cursor.next();
  // }
  // console.log(tempData)
  return {
    statusCode: 200,
    body: 'done',
  }
}

export {
  handler
}