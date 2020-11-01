export const createIndexArray = (length: number) =>
  Array(length)
    .fill({})
    .map((_, index) => index);
