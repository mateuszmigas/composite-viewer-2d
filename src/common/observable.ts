export type Observer<T> = (value: T) => void;

export class Observable<T> {
  observers: Observer<T>[] = [];

  constructor(private value: T | null) {}

  attach(observer: Observer<T>) {
    this.observers.push(observer);
  }

  detach(observer: Observer<T>) {
    this.observers.remove(observer);
  }

  setValue(newValue: T) {
    this.value = newValue;
    this.notify();
  }

  private notify() {
    if (this.value !== null) {
      const value = this.value;
      this.observers.forEach(o => o(value));
    }
  }
}
