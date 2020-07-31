export default class Util {
  private static MONEY_FORMATTER =
      new Intl.NumberFormat('en-us', {
        currency: "USD",
        minimumFractionDigits: 0,      
        maximumFractionDigits: 2,
      });

  static formatMoney(amount: number): string {
    let formatted = this.MONEY_FORMATTER.format(amount);
    if (amount < 0) {
      // Insert the dollar sign after the negative.
      formatted = `-$${formatted.substring(1)}`;
    } else {
      formatted = `$${formatted}`;
    }
    return formatted;
  }
}