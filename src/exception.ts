export class InputMethodException implements Error {
  constructor(public name: string, public message: string) {}

  toString() {
    return `InputMethod error: ${this.name}, ${this.message}`;
  }
}
