declare global {
  interface Array<T> {
    remove(item: T): void;
  }
}

Array.prototype.remove = function <T>(item: T) {
  const index = this.indexOf(item);

  if (index > -1) {
    this.splice(index, 1);
  }
};

export {};
