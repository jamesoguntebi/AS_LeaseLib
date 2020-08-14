export default class Util {
  private static MONEY_FORMATTER_WITH_CENTS = new Intl.NumberFormat('en-us', {
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  private static MONEY_FORMATTER = new Intl.NumberFormat('en-us', {
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  private static DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

  static formatMoney(amount: number): string {
    const formatter = Number.isInteger(amount) ?
        Util.MONEY_FORMATTER : Util.MONEY_FORMATTER_WITH_CENTS;
    let formatted = formatter.format(amount);
    if (amount < 0) {
      // Insert the dollar sign after the negative.
      formatted = `-$${formatted.substring(1)}`;
    } else {
      formatted = `$${formatted}`;
    }
    return formatted;
  }

  /** Returns date string of the form 'today' or 'on Jul 13'. */
  static dateString(date: Date): string {
    // TODO: Add year to string if not in current year.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateCopy = new Date(date.getTime());
    dateCopy.setHours(0, 0, 0, 0);

    if (today.getTime() === dateCopy.getTime()) return 'today';

    const yesterday = new Date(today.getTime() - Util.DAY_IN_MILLIS);
    if (yesterday.getTime() === dateCopy.getTime()) return 'yesterday';

    const tomorrow = new Date(today.getTime() + Util.DAY_IN_MILLIS);
    if (tomorrow.getTime() === dateCopy.getTime()) return 'tomorrow';

    const format = dateCopy.getFullYear() === today.getFullYear() ?
        'MMM dd' :
        'MMM dd, yyyy';

    return `on ${
        Utilities.formatDate(date, Session.getScriptTimeZone(), format)}`;
  }

  static getNextDayOfMonth(dayOfMonth: number): Date {
    Util.validateRecurringDayOfMonth(dayOfMonth);
    const date = new Date();
    if (dayOfMonth <= date.getDate()) date.setMonth(date.getMonth() + 1);
    date.setDate(dayOfMonth);
    return date;
  }

  static getNextDayOfMonthString(dayOfMonth: number): string {
    return Util.dateString(Util.getNextDayOfMonth(dayOfMonth));
  }

  /** Validates that `day` is in [1, 28], making it valid in every month. */
  static validateRecurringDayOfMonth(day: number) {
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      throw new Error(
          'Day of month must be a whole number from 1 to 28 to ' +
          `valid in all months. Got ${day}`);
    }
  }
}
