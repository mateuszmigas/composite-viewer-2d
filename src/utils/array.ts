export const createIndexArray = (length: number) =>
  Array(length)
    .fill({})
    .map((_, index) => index);

export const remove = <T>(array: T[], item: T) => {
  const index = array.indexOf(item);

  if (index > -1) {
    array.splice(index, 1);
  }
};

export const chunk = <T>(
  array: T[],
  chunkIndex: number,
  totalChunks: number
) => {
  const chunk = Math.ceil(array.length / totalChunks);
  const start = chunkIndex * chunk;
  const end = Math.min(start + chunk, array.length);
  return array.slice(start, end);
};
