import fs from "node:fs";
import path from "node:path";
import async from "async";

function recursiveFind(dir, keyword, cb) {
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

            // search in file
            fs.readFile(filePath, "utf8", (err, data) => {
              if (err) {
                return next(err);
              }

              if (data.includes(keyword)) {
                fileList.push(filePath);
              }
            });

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

recursiveFind("./node_modules", "import", (err, files) => {
  if (err) {
    console.error("Error:", err);
  } else {
    console.log("List of files:", files);
  }
});
