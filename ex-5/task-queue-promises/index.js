import { EventEmitter } from 'events';

export class TaskQueue extends EventEmitter {
  constructor(concurrency) {
    super();
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  runTask(task) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
          this.emit('error', error);
        } finally {
          this.running--;
          process.nextTick(this.next.bind(this));
        }
      });
      process.nextTick(this.next.bind(this));
    });
  }

  async next() {
    if (this.running === 0 && this.queue.length === 0) {
      return this.emit('empty');
    }

    const toRun = Math.min(this.queue.length, this.concurrency - this.running);
    this.running += toRun;

    const tasks = this.queue.splice(0, toRun);
    tasks.map(p => p());
  }
}

async function main() {
  const taskQueue = new TaskQueue(2);

  for (let i = 1; i <= 10; i += 1) {
    taskQueue.runTask(() => delay(1 * 1000)).then(console.log);
  }

  taskQueue.on('empty', () => console.log('Done!'));
  taskQueue.on('error', () => console.log('Error!'));
}

await main();

const delay = time =>
  new Promise(resolve => setTimeout(() => resolve(time), time));
