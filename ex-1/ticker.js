import { EventEmitter } from "events";
import process from "process";

function ticker(maxMs, cb) {
  const emitter = new EventEmitter();

  let count = 0;
  for (let ms = 50; ms <= maxMs; ms += 50) {
    setTimeout(() => {
      if (Date.now() % 5 === 0) {
        emitter.emit("error", new Error("Something has gone wrong"));
        cb(new Error("Something has gone wrong, sorry!"));
        return;
      }

      cb(null, ++count, ms);
      emitter.emit("tick", count, ms);
    }, ms);
  }

  return emitter;
}

ticker(1000, (err, ticks, timeTaken) => {
  if (err) {
    console.error(`An error has occured: ${err.message}`);
    return;
  }

  console.log(`Tick number: ${ticks}; time passed: ${timeTaken}`);
}).on("error", (err) => {
  console.log(`Ticking error: ${err.message}`);
});

process.on("uncaughtException", (err) => {
  console.log(`Caught an uncaught exception: ${err?.message}`);
});
