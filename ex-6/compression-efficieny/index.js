import { stat } from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream";
import { createBrotliCompress, createDeflate, createGzip } from "zlib";

await main();

async function main() {
  const filename = process.argv[2];

  const compressionStats = await compress(filename);
  const [deflateStats, gzipStats, brotliStats, originalStats] =
    await Promise.all([
      getFileData(`${filename}.deflate`),
      getFileData(`${filename}.gzip`),
      getFileData(`${filename}.brotli`),
      getFileData(filename),
    ]);

  Object.assign(deflateStats, {
    name: "deflate",
    size: `${Math.round(deflateStats.size / 1024)} KB`,
    time: `${Math.round(
      compressionStats.deflate.end - compressionStats.deflate.start,
    )} ms`,
  });
  Object.assign(gzipStats, {
    name: "gzip",
    size: `${Math.round(gzipStats.size / 1024)} KB`,
    time: `${Math.round(
      compressionStats.gzip.end - compressionStats.gzip.start,
    )} ms`,
  });
  Object.assign(brotliStats, {
    name: "brotli",
    size: `${Math.round(brotliStats.size / 1024)} KB`,
    time: `${Math.round(
      compressionStats.brotli.end - compressionStats.brotli.start,
    )} ms`,
  });
  Object.assign(originalStats, {
    name: "original",
    size: `${Math.round(originalStats.size / 1024)} KB`,
  });

  console.table(
    [originalStats, brotliStats, gzipStats, deflateStats],
    ["name", "size", "time"],
  );
}

async function compress(filename) {
  const inputStream = createReadStream(filename);

  const [deflateStats, gzipStats, brotliStats] = await Promise.all([
    compressDeflateWithStats(inputStream, filename),
    compressBrotliWithStats(inputStream, filename),
    compressGzipWithStats(inputStream, filename),
  ]);

  return {
    deflate: deflateStats,
    gzip: gzipStats,
    brotli: brotliStats,
  };
}

function compressDeflateWithStats(inputStream, filename) {
  let start;
  let end;

  const deflate = createDeflate();
  deflate.on("pipe", () => {
    start = Date.now();
  });
  deflate.on("close", () => {
    end = Date.now();
  });

  return new Promise((resolve, reject) => {
    pipeline(
      inputStream,
      deflate,
      createWriteStream(`${filename}.deflate`),
      (err) => {
        if (err) {
          return reject(err);
        }
        resolve({ start, end });
      },
    );
  });
}

function compressGzipWithStats(inputStream, filename) {
  let start;
  let end;

  const gzip = createGzip();
  gzip.on("pipe", () => {
    start = Date.now();
  });
  gzip.on("close", () => {
    end = Date.now();
  });

  return new Promise((resolve, reject) => {
    pipeline(
      inputStream,
      gzip,
      createWriteStream(`${filename}.gzip`),
      (err) => {
        if (err) {
          return reject(err);
        }
        resolve({ start, end });
      },
    );
  });
}

function compressBrotliWithStats(inputStream, filename) {
  let start;
  let end;

  const brotli = createBrotliCompress();
  brotli.on("pipe", () => {
    start = Date.now();
  });
  brotli.on("close", () => {
    end = Date.now();
  });

  return new Promise((resolve, reject) => {
    pipeline(
      inputStream,
      brotli,
      createWriteStream(`${filename}.brotli`),
      (err) => {
        if (err) {
          return reject(err);
        }
        resolve({ start, end });
      },
    );
  });
}

function getFileData(filename) {
  return stat(filename);
}
