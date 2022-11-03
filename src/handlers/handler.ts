import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda"
import { getPqFiles } from "src/resources/s3FileOpener"

const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const { Bucket, Path, MaxSize } = event.body ? JSON.parse(event.body) : null
  if (!Bucket || !Path || !MaxSize) throw new Error('Missing required parameters')
  console.log({ Bucket, Path, MaxSize })
  //Convert max size to bytes
  await getPqFiles(Bucket, Path, MaxSize * 1024 * 1024)

  return {
    statusCode: 200,
    body: 'done',
  }
}

export {
  handler
}