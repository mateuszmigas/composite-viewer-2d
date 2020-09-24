/* eslint-disable */
const calculationWorker: Worker = self as any;

calculationWorker.onmessage = event => {
  let x = 3;

  console.log("cycki22222222", event.data);

  calculationWorker.postMessage("FSE111111111111111S'");
};

export default calculationWorker;
