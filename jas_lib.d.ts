/// <reference types="google-apps-script" />
declare module "testing/spy" {
    export class Spy<TObj, TProp extends keyof TObj> {
        private readonly object;
        private readonly property;
        static isSpy(object: unknown): object is {
            [Spy.MARKER]: Spy<any, any>;
        };
        static assertSpy(object: unknown): Spy<any, any>;
        private static readonly MARKER;
        private readonly calls;
        private storedProperty;
        readonly and: SpyAction;
        constructor(object: TObj, property: TProp);
        reset(): void;
        clearCalls(): void;
        getCalls(): unknown[][];
        toString(): string;
    }
    export class SpyAction {
        private readonly defaultImplementation;
        private actionType;
        private fakeCall;
        constructor(defaultImplementation: Function);
        call(params: unknown[]): unknown;
        callThrough(): void;
        callFake(fakeFn: Function): void;
        returnValue(retValue: unknown): void;
    }
}
declare module "testing/util" {
    export class Util {
        static isPOJO(arg: unknown): arg is Pojo;
        static equals<U>(a: U, b: U): boolean;
        static arrayEquals(arr1: unknown[], arr2: unknown[]): boolean;
        static pojoEquals(obj1: Pojo, obj2: Pojo): boolean;
        static isError(e: unknown): e is Error;
    }
    type Pojo = Record<string, unknown>;
}
declare module "testing/expectation" {
    export class Expectation<T> {
        private readonly actual;
        private readonly isInverse;
        /** The inverse of this expectation. */
        readonly not: Expectation<T>;
        readonly notString: string;
        constructor(actual: T, isInverse?: boolean, notSource?: Expectation<T>);
        toEqual(expected: T): void;
        toThrow(expectedErrorMessage?: string): void;
        toContain(expectedContents: unknown): void;
        toHaveBeenCalled(): void;
        toHaveBeenCalledTimes(expected: number): void;
        toHaveBeenCalledLike(spyMatcher: SpyMatcher): void;
        toHaveBeenCalledWith(...expectedArgs: unknown[]): void;
        toBeUndefined(): void;
        private static augmentAndThrow;
    }
    export class SpyMatcher {
        readonly argsMatcher: (args: unknown[]) => boolean;
        constructor(argsMatcher: (args: unknown[]) => boolean);
    }
}
declare module "testing/tester" {
    import { Expectation, SpyMatcher } from "testing/expectation";
    import { Spy } from "testing/spy";
    export class Tester {
        private readonly verbose;
        static readonly ERROR_NAME = "TesterError";
        private static readonly INDENT_PER_LEVEL;
        private indentation;
        private currentDescriptionContext;
        private descriptionContextStack;
        private currentItContext;
        constructor(verbose?: boolean);
        describe(description: string, testFn: () => void): void;
        xdescribe(description: string, testFn: () => void): void;
        beforeAll(beforeFn: () => void): void;
        beforeEach(beforeFn: () => void): void;
        afterEach(afterFn: () => void): void;
        afterAll(afterFn: () => void): void;
        private maybeExecuteBeforeAlls;
        it(unitTestName: string, testFn: () => void): void;
        xit(unitTestName: string, testFn: () => void): void;
        expect<T>(actual: T): Expectation<T>;
        spyOn<TObj, TProp extends keyof TObj>(object: TObj, method: TProp): Spy<TObj, TProp>;
        matcher(argsMatcher: (args: unknown[]) => boolean): SpyMatcher;
        finish(): TestResult;
        private indent;
        private dedent;
        private output;
        private getEmptyDescriptionContext;
        private throwTesterError;
    }
    export interface DescriptionContext {
        beforeAlls: Array<() => void>;
        beforeEaches: Array<() => void>;
        afterEaches: Array<() => void>;
        afterAlls: Array<() => void>;
        beforeAllsCalled?: boolean;
        successCount: number;
        failureCount: number;
        output: string[];
        spies: Spy<any, any>[];
    }
    export interface ItContext {
        spies: Spy<any, any>[];
    }
    export interface TestResult {
        successCount: number;
        failureCount: number;
        output: string[];
    }
}
declare module "testing/testrunner" {
    import { Tester } from "testing/tester";
    export function runTests(tests: Test[], options: TestRunnerOptions): string;
    export class TestRunner {
        static run(tests: Test[], { suppressLogs, showSuccesses, testerClass, }: TestRunnerOptions): void;
        private static getStats;
    }
    export interface Test {
        name: string;
        run: (t: Tester) => void;
    }
    export interface TestRunnerOptions {
        suppressLogs?: boolean;
        showSuccesses?: boolean;
        testerClass?: typeof Tester;
    }
}
declare module "testing/fakes" {
    type GmailLabel = GoogleAppsScript.Gmail.GmailLabel;
    export class FakeGmailApp {
        private static labelMap;
        static setData(params: GmailAppParams): void;
        static getUserLabelByName(name: string): GmailLabel | null;
    }
    interface GmailAppParams {
        labels?: GmailLabelParams[];
    }
    interface GmailLabelParams {
        name: string;
        threads?: GmailThreadParams[];
    }
    interface GmailThreadParams {
        messages?: GmailMessageParams[];
    }
    export interface GmailMessageParams {
        date?: Date;
        from?: string;
        plainBody?: string;
        subject?: string;
    }
    export class FakeProperties {
        private readonly properties;
        deleteAllProperties(): this;
        deleteProperty(key: string): this;
        getKeys(): string[];
        getProperties(): Record<string, string>;
        getProperty(key: string): string;
        setProperties(properties: Record<string, string>, deleteAllOthers?: boolean): void;
        setProperty(key: string, value: string): void;
    }
}
declare module "apihelper" {
    export { Spy } from "testing/spy";
    export { Tester } from "testing/tester";
    export { Test, TestRunner, TestRunnerOptions } from "testing/testrunner";
    export { Util } from "testing/util";
    export * from "testing/fakes";
}
declare module "jas_api" {
    import * as JASLib from "apihelper";
    export { JASLib };
}
declare module "testing/_simple_test" {
    /** For testing the test framework. */
    export default abstract class SimpleTest {
        protected readonly output: string[];
        private successes;
        private failures;
        constructor();
        run(): void;
        finish(): string[];
        /**
         * @param testFn A function that should throw if the test unit fails. It will
         *     be bound to `this`, allowing callers to conviently call
         *     `runUnit('description', this.test1)`.
         */
        private runUnit;
        /**
         * Throws an error that the Tester class always catches and rethrows, so that
         * when testing Tester, failures aren't suppressed.
         */
        protected fail(): void;
        protected failIfThrows(fn: Function): void;
        protected failIfNotThrows(fn: Function): void;
    }
}
declare module "testing/expectation_test" {
    import SimpleTest from "testing/_simple_test";
    export default class ExpectationTest extends SimpleTest {
        private createSpy;
        testToEqual(): void;
        testNotToEqual(): void;
        testToThrow(): void;
        testNotToThrow(): void;
        testToContain(): void;
        testNotToContain(): void;
        testToHaveBeenCalled(): void;
        testNotToHaveBeenCalled(): void;
        testToHaveBeenCalledTimes(): void;
        testNotToHaveBeenCalledTimes(): void;
        testToHaveBeenCalledLike(): void;
        testNotToHaveBeenCalledLike(): void;
        testToHaveBeenCalledWith(): void;
        testNotToHaveBeenCalledWith(): void;
        testToBeUndefined(): void;
        testNotToBeUndefined(): void;
    }
}
declare module "testing/spy_test" {
    import SimpleTest from "testing/_simple_test";
    export default class SpyTest extends SimpleTest {
        private createSpy;
        testAssertSpyFailsNonSpies(): void;
        testAssertSpyPassesSpies(): void;
        testCallCount(): void;
        testCallArgs(): void;
        testReset(): void;
        testClearCalls(): void;
        testDefaultSpyAction(): void;
        testAndCallThrough(): void;
        testAndCallFake(): void;
        testAndReturnValue(): void;
    }
}
declare module "testing/tester_test" {
    import SimpleTest from "testing/_simple_test";
    export default class TesterTest extends SimpleTest {
        private createFail;
        private createSuccess;
        private callBeforesAndAfters;
        private callIts;
        /**
         * Runs a bunch of describe(), it(), before*(), after*() scenarios on a new
         * Tester, and returns the test result. Also returns a map containing call
         * counts for before*() and after*() testing.
         */
        private doAllTestScenarios;
        testFinish_stats(): void;
        testXdescribe(): void;
        testBeforeAll(): void;
        testBeforeEach(): void;
        testAfterEach(): void;
        testAfterAll(): void;
        testDescribe_illegalContext(): void;
        testBeforesAndAfters_illegalContext(): void;
        testIt_illegalContext(): void;
        testXit(): void;
        testSpyOn(): void;
    }
}
declare module "testing/simple_test_runner" {
    export function runFrameworkTests(): string;
    export default class SimpleTestRunner {
        static run(): string;
    }
}
