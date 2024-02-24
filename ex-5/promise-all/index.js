function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    let count = 0;
    const results = [];

    for (let i = 0; i < promises.length; i++) {
      promises[i].then(v => (promised(), (results[i] = v)), reject);
    }

    function promised() {
      if (promises.length === ++count) {
        resolve(results);
      }
    }
  });
}

main().then(() => console.log('done'));

async function main() {
  console.log('before promising');

  const promises = await promiseAll([
    new Promise(resolve =>
      setTimeout(() => {
        console.log('resoliving 3 sec');
        resolve(1);
      }, 3000)
    ),
    new Promise(resolve =>
      setTimeout(() => (resolve(2), console.log('resolving 2 sec')), 2000)
    ),
    new Promise(resolve =>
      setTimeout(() => (resolve(3), console.log('resolving 1 sec')), 1000)
    ),
  ]);

  console.log(promises);
}
