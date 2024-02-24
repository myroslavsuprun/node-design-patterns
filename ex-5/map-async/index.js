// Implementation
async function mapAsync(iterable, cb, concurrency) {
  let running = 0;
  const taskQueue = [];

  const runTask = async (item) => {
    return new Promise((resolve, reject) => {
      taskQueue.push(() => item().then(resolve, reject));
      process.nextTick(consume);
    });
  };

  const consume = async () => {
    while (running < concurrency && taskQueue.length !== 0) {
      console.log("spanning new consumer");
      running++;
      const curr = taskQueue.shift();
      await curr();
      running--;
      console.log("shutting down consumer");
      consume();
    }
  };

  return Promise.all(
    iterable.map((item, idx, arr) => runTask(() => cb(item, idx, arr))),
  );
}

// Testing
async function main() {
  const iterable = [1, 2, 3];
  const callback = async (item) => {
    return item * 2;
  };
  const concurrency = 1;

  const result = await mapAsync(iterable, callback, concurrency);
  console.log(result);
}

main();
