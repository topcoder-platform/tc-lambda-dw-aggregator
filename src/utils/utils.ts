import fs from "fs";
import { TEMP_FOLDER } from "src/conf";
const cleanTemp = async (): Promise<void> => {
  const files = fs.readdirSync(TEMP_FOLDER);
  await Promise.all(
    files.map(async (file: string) => {
      fs.unlinkSync(`${TEMP_FOLDER}/${file}`);
    })
  );
};

export { cleanTemp };
