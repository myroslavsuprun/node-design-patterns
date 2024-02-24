import fs from "node:fs";

function concatFiles(...args) {
  const cb = args.pop();
  const dest = args.pop();
  const files = args;

  readFiles(files, (err, data) => {
    if (err) {
      return cb(err);
    }

    fs.appendFile(`./${dest}`, data, cb);
  });
}

function readFiles(files, cb) {
  const chunks = [];
  let processed = 0;
  files.forEach((filename) => {
    fs.readFile(`./${filename}`, (err, fileData) => {
      if (err) {
        return cb(err);
      }

      chunks.push(fileData);

      if (++processed === files.length) {
        const data = Buffer.concat(chunks);
        cb(null, data);
      }
    });
  });
}

concatFiles("f-1.txt", "f-2.txt", "dest.txt", (err) => {
  if (err) {
    return console.error(err);
  }

  console.log("Concantenated successfully");
});
