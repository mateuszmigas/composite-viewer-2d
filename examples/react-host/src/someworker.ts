/* eslint-disable */
//@ts-ignore
const calculationWorker: Worker = self as any;

calculationWorker.addEventListener("message", event => {
  let x = 3;
  console.log("cycki222");

  calculationWorker.postMessage("FSE111111111111111S'");
});
