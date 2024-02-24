export class TaskQueuePC {
  constructor(concurrency) {
    this.taskQueue = [];
    this.consumerQueue = [];

    for (let i = 0; i < concurrency; i++) {
      this.consumer();
    }
  }

  consumer() {
    this.getNextTask()
      .then((v) => v())
      .then(() => {
        this.consumer();
      });
  }

  getNextTask() {
    return new Promise((resolve) => {
      if (this.taskQueue.length !== 0) {
        return resolve(this.taskQueue.shift());
      }
      this.consumerQueue.push(resolve);
    });
  }

  runTask(task) {
    return new Promise((resolve, reject) => {
      const taskWrapper = () => {
        const taskPromise = task();
        taskPromise.then(resolve, reject);
        return taskPromise;
      };
      if (this.consumerQueue.length !== 0) {
        const consumer = this.consumerQueue.shift();
        consumer(taskWrapper);
      } else {
        this.taskQueue.push(taskWrapper);
      }
    });
  }
}

async function main() {
  const taskQueue = new TaskQueuePC(2);
  const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));
  const task1 = () => delay(1000).then(() => console.log("task1"));
  const task2 = () => delay(1000).then(() => console.log("task2"));
  const task3 = () => delay(1000).then(() => console.log("task3"));
  const task4 = () => delay(1000).then(() => console.log("task4"));

  await Promise.all([
    taskQueue.runTask(task1),
    taskQueue.runTask(task2),
    taskQueue.runTask(task3),
    taskQueue.runTask(task4),
  ]);
}

main().then(() => console.log("done"));
