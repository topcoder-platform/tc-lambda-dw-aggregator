import assert from "assert";

export const AWS_ACCOUNT_ID = <string>process.env.AWS_ACCOUNT_ID;
export const AWS_REGION_INSTANCE = <string>process.env.AWS_REGION_INSTANCE;
export const AWS_DW_RAW_BUCKET = <string>process.env.AWS_DW_RAW_BUCKET;
export const TEMP_FOLDER = <string>process.env.TEMP_FOLDER;

assert(AWS_ACCOUNT_ID, "AWS_ACCOUNT_ID is required");
assert(AWS_REGION_INSTANCE, "AWS_REGION is required");
assert(AWS_DW_RAW_BUCKET, "AWS_DW_RAW_BUCKET is required");
assert(TEMP_FOLDER, "TEMP_FOLDER is required");
