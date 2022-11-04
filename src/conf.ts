import assert from "assert";

export const AWS_ACCOUNT_ID = <string>process.env.AWS_ACCOUNT_ID;
export const AWS_REGION = <string>process.env.AWS_REGION;
export const AWS_DW_RAW_BUCKET = <string>process.env.AWS_DW_RAW_BUCKET;

assert(AWS_ACCOUNT_ID, "AWS_ACCOUNT_ID is required");
assert(AWS_REGION, "AWS_REGION is required");
assert(AWS_DW_RAW_BUCKET, "AWS_DW_RAW_BUCKET is required");
