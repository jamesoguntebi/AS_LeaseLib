import ExpectationTest from "./expectation_test";
import SimpleTest from "./_simple_test";
import SpyTest from "./spy_test";
import TesterTest from "./tester_test";

export function runFrameworkTests(): string {
  return SimpleTestRunner.run();
}

export default class SimpleTestRunner {
  static run(): string {
    const tests: SimpleTest[] = [
      new ExpectationTest(),
      new SpyTest(),
      new TesterTest(),
    ];

    const output: string[] = ['Testing...\n'];
    const startTime = Date.now();

    for (const test of tests) {
      test.run();
      output.push(...test.finish());
    }

    output.push('', `Runtime: ${Date.now() - startTime} ms`);

    return output.join('\n');
  }
}