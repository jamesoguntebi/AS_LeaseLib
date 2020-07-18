export default class Util {
  static isPOJO(arg: unknown): arg is Pojo {
    if (arg == null || typeof arg !== 'object') {
      return false;
    }
    const proto = Object.getPrototypeOf(arg);
    // Prototype may be null if you used `Object.create(null)`
    // Checking `proto`'s constructor is safe because `getPrototypeOf()`
    // explicitly crosses the boundary from object data to object metadata.
    return !proto || proto.constructor.name === 'Object';
  }

  static equals<U>(a: U, b: U): boolean {
    if (Array.isArray(a) && Array.isArray(b)) {
      return Util.arrayEquals(a, b);
    }
    if (Util.isPOJO(a) && Util.isPOJO(b)) {
      return Util.pojoEquals(a, b);
    }
    return a === b;
  }

  static arrayEquals(arr1: unknown[], arr2: unknown[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((el, i) => Util.equals(el, arr2[i]));
  }

  static pojoEquals(obj1: Pojo, obj2: Pojo): boolean {
    // Remove keys that have undefined values.
    const clearUndefinedValues = (obj: Pojo) => {
      for (const key in obj) if (obj[key] === undefined) delete obj[key];
    };
    clearUndefinedValues(obj1);
    clearUndefinedValues(obj2);

    if (Object.keys(obj1).length !== Object.keys(obj2).length) return false;

    for (const key in obj1) {
      if (!Util.equals(obj1[key], obj2[key])) return false;
    }
    return true;
  }
}

type Pojo = Record<string, unknown>;