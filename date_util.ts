export default class DateUtil {
  /** Whether these dates are the same, ignoring time. */
  static isSameDay(date1: Date, date2: Date): boolean {
    date1.setHours(0, 0, 0, 0);
    date2.setHours(0, 0, 0, 0);
    return date1.getTime() === date2.getTime();
  }

  // Returns true if given value is a date object.
  static isDateValue(value: any) {
    return Object.prototype.toString.call(value) === '[object Date]' &&
        !isNaN(value.getTime());
  }
}