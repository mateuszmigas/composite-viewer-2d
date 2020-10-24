export const repeatNTimes = (count: number) =>
  Array(count)
    .fill({})
    .map((_, index) => index);
