/**
 * Format number with Indian numbering system (lakhs/crores)
 * Example: 1234567.89 -> 12,34,567.89
 */
export function formatIndianNumber(num: number): string {
  const [integer, decimal] = num.toFixed(2).split('.');
  const lastThree = integer.slice(-3);
  const otherNumbers = integer.slice(0, -3);
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + (otherNumbers ? ',' : '') + lastThree;
  return decimal ? `${formatted}.${decimal}` : formatted;
}

/**
 * Format number with international numbering system (thousands/millions)
 * Example: 1234567.89 -> 1,234,567.89
 */
export function formatInternationalNumber(num: number): string {
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Convert number to words (Indian system)
 */
export function numberToWordsIndian(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigit(n: number): string {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }

  if (num === 0) return 'Zero';

  const [integer, decimal] = num.toFixed(2).split('.');
  const intNum = parseInt(integer);
  let result = '';

  // Crores
  if (intNum >= 10000000) {
    result += convertTwoDigit(Math.floor(intNum / 10000000)) + ' Crore ';
  }

  // Lakhs
  const lakhs = Math.floor((intNum % 10000000) / 100000);
  if (lakhs > 0) {
    result += convertTwoDigit(lakhs) + ' Lakh ';
  }

  // Thousands
  const thousands = Math.floor((intNum % 100000) / 1000);
  if (thousands > 0) {
    result += convertTwoDigit(thousands) + ' Thousand ';
  }

  // Hundreds
  const hundreds = Math.floor((intNum % 1000) / 100);
  if (hundreds > 0) {
    result += ones[hundreds] + ' Hundred ';
  }

  // Tens and ones
  const remainder = intNum % 100;
  if (remainder > 0) {
    result += convertTwoDigit(remainder);
  }

  result = result.trim();

  // Add decimal part (paise for Indian currency)
  const decimalNum = parseInt(decimal);
  if (decimalNum > 0) {
    result += ' and ' + convertTwoDigit(decimalNum) + ' Paise';
  }

  return result + ' Only';
}

/**
 * Convert number to words (International system)
 */
export function numberToWordsInternational(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigit(n: number): string {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }

  if (num === 0) return 'Zero';

  const [integer, decimal] = num.toFixed(2).split('.');
  const intNum = parseInt(integer);
  let result = '';

  // Millions
  if (intNum >= 1000000) {
    result += convertTwoDigit(Math.floor(intNum / 1000000)) + ' Million ';
  }

  // Thousands
  const thousands = Math.floor((intNum % 1000000) / 1000);
  if (thousands > 0) {
    result += convertTwoDigit(thousands) + ' Thousand ';
  }

  // Hundreds
  const hundreds = Math.floor((intNum % 1000) / 100);
  if (hundreds > 0) {
    result += ones[hundreds] + ' Hundred ';
  }

  // Tens and ones
  const remainder = intNum % 100;
  if (remainder > 0) {
    result += convertTwoDigit(remainder);
  }

  result = result.trim();

  // Add decimal part (cents)
  const decimalNum = parseInt(decimal);
  if (decimalNum > 0) {
    result += ' and ' + convertTwoDigit(decimalNum) + ' Cents';
  }

  return result + ' Only';
}

/**
 * Format currency based on whether it's Indian or international
 */
export function formatCurrencyAmount(amount: number, currency: string, isIndian: boolean = false): string {
  const formatted = isIndian ? formatIndianNumber(amount) : formatInternationalNumber(amount);
  return `${currency} ${formatted}`;
}

/**
 * Convert amount to words with currency
 */
export function amountToWords(amount: number, currency: string, isIndian: boolean = false): string {
  const words = isIndian ? numberToWordsIndian(amount) : numberToWordsInternational(amount);
  return `${currency} ${words}`;
}
