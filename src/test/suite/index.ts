import * as fs from "fs";
import * as path from "path";
import Mocha from "mocha";

export function run(): Promise<void> {
  const mocha = new Mocha({
    color: true,
    ui: "tdd"
  });

  const testsRoot = __dirname;
  const files = fs.readdirSync(testsRoot).filter((file) => file.endsWith(".test.js"));

  for (const file of files) {
    mocha.addFile(path.resolve(testsRoot, file));
  }

  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} test failure${failures === 1 ? "" : "s"}`));
      } else {
        resolve();
      }
    });
  });
}
