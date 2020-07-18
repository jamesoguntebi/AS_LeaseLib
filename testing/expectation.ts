import Spy from "./spy";
import Util from "./util";

export default class Expectation<T> {
  /** The inverse of this expectation. */
  readonly not: Expectation<T>;
  readonly notString: string;

  constructor(
    private readonly actual: T,
    private readonly isInverse = false,
    notSource?: Expectation<T>
  ) {
    this.not = notSource ?? new Expectation(actual, !this.isInverse, this);
    this.notString = this.isInverse ? 'not ' : '';
  }

  toEqual(expected: T) {
    const equals = Util.equals(this.actual, expected);
    if (equals && this.isInverse) {
      throw new Error(`Expected anything but ${expected}.`);
    } else if (!equals && !this.isInverse) {
      throw new Error(`Expected ${expected}, got ${this.actual}.`);
    }
  }

  toThrow(expectedErrorMessage?: string) {
    if (typeof this.actual !== 'function') {
      throw new Error('Expectation is not a function');
    }

    const errorMatchesExpectedMessage = (e: unknown): boolean => {
      if (!(e instanceof Error) || !expectedErrorMessage) return false;
      return (e.stack || e.message || '')
        .toLowerCase()
        .includes(expectedErrorMessage.toLowerCase());
    };

    const fail = (e: unknown, prefixMessage: string) => {
      if (e instanceof Error) {
        Expectation.augmentAndThrow(e, prefixMessage);
      } else {
        throw new Error(prefixMessage);
      }
    };

    if (!this.isInverse) {
      const DO_NOT_CATCH = String(Math.random());
      try {
        this.actual();
        throw new Error(DO_NOT_CATCH);
      } catch (e) {
        if (e.message === DO_NOT_CATCH) {
          throw new Error('Expected function to throw.');
        }
        if (expectedErrorMessage && !errorMatchesExpectedMessage(e)) {
          fail(e, `Expected error to include '${expectedErrorMessage}'`);
        }
      }
    } else {
      try {
        this.actual();
      } catch (e) {
        if (!expectedErrorMessage) {
          fail(e, 'Expected function not to throw.');
        }
        if (errorMatchesExpectedMessage(e)) {
          fail(e, `Expected error not to include '${expectedErrorMessage}'`);
        }
      }
    }
  }

  toContain(expectedContents: unknown) {
    if (typeof this.actual === 'string') {
      if (typeof expectedContents !== 'string') {
        throw new Error(
          `Cannot check containment in a string. Got ${typeof expectedContents}`
        );
      }
      if (this.isInverse === this.actual.includes(expectedContents)) {
        throw new Error(
          `Expected ${this.actual} ${this.notString}to contain '${expectedContents}'.`
        );
      }
      return;
    }

    if (typeof Array.isArray(this.actual)) {
      if (
        this.isInverse ===
        ((this.actual as unknown) as any[]).includes(expectedContents)
      ) {
        throw new Error(
          `Expected ${this.actual} ${this.notString}to contain '${expectedContents}'.`
        );
      }
      return;
    }

    throw new Error('Can only check containment of arrays and strings.');
  }

  toHaveBeenCalled() {
    const spy = Spy.assertSpy(this.actual);
    if (this.isInverse === !!spy.getCalls().length) {
      throw new Error(`Expected ${spy} ${this.notString}to have been called.`);
    }
  }

  toHaveBeenCalledTimes(expected: number) {
    const spy = Spy.assertSpy(this.actual);
    const actual = spy.getCalls().length;
    if (this.isInverse === (actual === expected)) {
      throw new Error(
        `Expected ${spy} ${
          this.notString
        }to have been called ${expected} times.${
          this.isInverse ? '' : ` Called ${actual} times.`
        }`
      );
    }
  }

  toHaveBeenCalledLike(spyMatcher: SpyMatcher) {
    const spy = Spy.assertSpy(this.actual);
    const someCallMatches = spy.getCalls().some((callArgs: unknown[]) => {
      return spyMatcher.argsMatcher(callArgs);
    });
    if (this.isInverse === someCallMatches) {
      throw new Error(
        `Expected ${spy} ${this.notString}to have been called ` +
          `according to this matcher.`
      );
    }
  }

  toHaveBeenCalledWith(...expectedArgs: unknown[]) {
    const spy = Spy.assertSpy(this.actual);
    const someCallMatches = spy.getCalls().some((callArgs: unknown[]) => {
      return Util.arrayEquals(expectedArgs, callArgs);
    });
    if (this.isInverse === someCallMatches) {
      throw new Error(
        `Expected ${spy} ${this.notString}to have been called ` +
          `with the given parameters.`
      );
    }
  }

  toBeUndefined() {
    if (this.isInverse === (this.actual === undefined)) {
      throw new Error(
        `Expected ${this.actual} ${this.notString}to be undefined.`
      );
    }
  }

  private static augmentAndThrow(e: Error, expectationMsg: string): never {
    e.message = `${expectationMsg}\n${e.message}`;
    e.stack = `${expectationMsg}\n${e.stack}`;
    throw e;
  }
}

export class SpyMatcher {
  constructor(readonly argsMatcher: (args: unknown[]) => boolean) {}
}
