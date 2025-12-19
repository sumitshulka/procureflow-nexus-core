// Currency utilities for vendor registration and system-wide currency handling

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface Country {
  name: string;
  code: string;
  currency: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
];

export const COUNTRIES: Country[] = [
  { name: 'India', code: 'IN', currency: 'INR' },
  { name: 'United States', code: 'US', currency: 'USD' },
  { name: 'United Kingdom', code: 'GB', currency: 'GBP' },
  { name: 'Canada', code: 'CA', currency: 'CAD' },
  { name: 'Australia', code: 'AU', currency: 'AUD' },
  { name: 'Germany', code: 'DE', currency: 'EUR' },
  { name: 'France', code: 'FR', currency: 'EUR' },
  { name: 'Italy', code: 'IT', currency: 'EUR' },
  { name: 'Spain', code: 'ES', currency: 'EUR' },
  { name: 'Netherlands', code: 'NL', currency: 'EUR' },
  { name: 'Belgium', code: 'BE', currency: 'EUR' },
  { name: 'Austria', code: 'AT', currency: 'EUR' },
  { name: 'Finland', code: 'FI', currency: 'EUR' },
  { name: 'Ireland', code: 'IE', currency: 'EUR' },
  { name: 'Portugal', code: 'PT', currency: 'EUR' },
  { name: 'Greece', code: 'GR', currency: 'EUR' },
  { name: 'Japan', code: 'JP', currency: 'JPY' },
  { name: 'China', code: 'CN', currency: 'CNY' },
  { name: 'South Korea', code: 'KR', currency: 'KRW' },
  { name: 'Singapore', code: 'SG', currency: 'SGD' },
  { name: 'Hong Kong', code: 'HK', currency: 'HKD' },
  { name: 'Thailand', code: 'TH', currency: 'THB' },
  { name: 'Malaysia', code: 'MY', currency: 'MYR' },
  { name: 'Indonesia', code: 'ID', currency: 'IDR' },
  { name: 'Philippines', code: 'PH', currency: 'PHP' },
  { name: 'Vietnam', code: 'VN', currency: 'VND' },
  { name: 'Bangladesh', code: 'BD', currency: 'BDT' },
  { name: 'Sri Lanka', code: 'LK', currency: 'LKR' },
  { name: 'Pakistan', code: 'PK', currency: 'PKR' },
  { name: 'Nepal', code: 'NP', currency: 'NPR' },
  { name: 'Brazil', code: 'BR', currency: 'BRL' },
  { name: 'Mexico', code: 'MX', currency: 'MXN' },
  { name: 'Argentina', code: 'AR', currency: 'ARS' },
  { name: 'Chile', code: 'CL', currency: 'CLP' },
  { name: 'Colombia', code: 'CO', currency: 'COP' },
  { name: 'South Africa', code: 'ZA', currency: 'ZAR' },
  { name: 'Russia', code: 'RU', currency: 'RUB' },
  { name: 'Turkey', code: 'TR', currency: 'TRY' },
  { name: 'Israel', code: 'IL', currency: 'ILS' },
  { name: 'Saudi Arabia', code: 'SA', currency: 'SAR' },
  { name: 'United Arab Emirates', code: 'AE', currency: 'AED' },
  { name: 'Egypt', code: 'EG', currency: 'EGP' },
  { name: 'Nigeria', code: 'NG', currency: 'NGN' },
  { name: 'Kenya', code: 'KE', currency: 'KES' },
  { name: 'Switzerland', code: 'CH', currency: 'CHF' },
  { name: 'Norway', code: 'NO', currency: 'NOK' },
  { name: 'Sweden', code: 'SE', currency: 'SEK' },
  { name: 'Denmark', code: 'DK', currency: 'DKK' },
  { name: 'Poland', code: 'PL', currency: 'PLN' },
  { name: 'Czech Republic', code: 'CZ', currency: 'CZK' },
  { name: 'Hungary', code: 'HU', currency: 'HUF' },
  { name: 'New Zealand', code: 'NZ', currency: 'NZD' },
];

/**
 * Get currency for a given country
 */
export const getCurrencyForCountry = (countryName: string): string => {
  const country = COUNTRIES.find(c => 
    c.name.toLowerCase() === countryName.toLowerCase()
  );
  return country?.currency || 'USD';
};

/**
 * Get currency symbol for a given currency code
 */
export const getCurrencySymbol = (currencyCode: string): string => {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
};

/**
 * Get currency name for a given currency code
 */
export const getCurrencyName = (currencyCode: string): string => {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  return currency?.name || currencyCode;
};

/**
 * Format amount with currency symbol
 */
export const formatCurrency = (amount: number, currencyCode: string = 'USD'): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toLocaleString()}`;
};

/**
 * Get organization default currency (to be used when org settings are available)
 */
export const getOrganizationCurrency = (orgSettings?: { base_currency: string }): string => {
  return orgSettings?.base_currency || 'USD';
};