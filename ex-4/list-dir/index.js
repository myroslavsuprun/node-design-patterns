import fs from "fs";
import path from "path";
import async from "async";

function listNestedFiles(dir, cb) {
  let fileList = [];

  function processDirectory(dirPath, callback) {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        return callback(err);
      }

      async.eachSeries(
        files,
        (file, next) => {
          const filePath = path.join(dirPath, file);

          fs.stat(filePath, (err, stats) => {
            if (err) {
              return next(err);
            }

            if (stats.isDirectory()) {
              return processDirectory(filePath, next);
            }

            fileList.push(filePath);
            next();
          });
        },
        (err) => {
          if (err) {
            return callback(err);
          }
          callback(null);
        },
      );
    });
  }

  processDirectory(dir, (err) => {
    if (err) {
      cb(err, null);
    } else {
      cb(null, fileList);
    }
  });
}

listNestedFiles("./node_modules", (err, files) => {
  if (err) {
    console.error("Error:", err);
  } else {
    console.log("List of files:", files);
  }
});
