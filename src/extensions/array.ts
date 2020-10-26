declare global {
  interface Array<T> {
    remove(item: T): void;
    chunk(chunkIndex: number, totalChunks: number): T[];
  }
}

Array.prototype.remove = function <T>(item: T) {
  const index = this.indexOf(item);

  if (index > -1) {
    this.splice(index, 1);
  }
};

Array.prototype.chunk = function (chunkIndex: number, totalChunks: number) {
  const chunk = Math.ceil(this.length / totalChunks);
  const start = chunkIndex * chunk;
  const end = Math.min(start + chunk, this.length);
  return this.slice(start, end);
};

export {};
