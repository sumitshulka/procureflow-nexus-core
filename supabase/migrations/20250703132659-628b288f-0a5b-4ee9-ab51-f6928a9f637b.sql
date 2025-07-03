-- Add currency and country currency mapping to vendor_registrations
ALTER TABLE public.vendor_registrations ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE public.vendor_registrations ADD COLUMN country VARCHAR(100);

-- Create function to get currency based on country
CREATE OR REPLACE FUNCTION public.get_currency_for_country(country_name TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Return currency based on country
    RETURN CASE UPPER(country_name)
        WHEN 'INDIA' THEN 'INR'
        WHEN 'UNITED STATES' THEN 'USD'
        WHEN 'UNITED KINGDOM' THEN 'GBP'
        WHEN 'CANADA' THEN 'CAD'
        WHEN 'AUSTRALIA' THEN 'AUD'
        WHEN 'GERMANY' THEN 'EUR'
        WHEN 'FRANCE' THEN 'EUR'
        WHEN 'ITALY' THEN 'EUR'
        WHEN 'SPAIN' THEN 'EUR'
        WHEN 'NETHERLANDS' THEN 'EUR'
        WHEN 'BELGIUM' THEN 'EUR'
        WHEN 'AUSTRIA' THEN 'EUR'
        WHEN 'FINLAND' THEN 'EUR'
        WHEN 'IRELAND' THEN 'EUR'
        WHEN 'PORTUGAL' THEN 'EUR'
        WHEN 'GREECE' THEN 'EUR'
        WHEN 'JAPAN' THEN 'JPY'
        WHEN 'CHINA' THEN 'CNY'
        WHEN 'SOUTH KOREA' THEN 'KRW'
        WHEN 'SINGAPORE' THEN 'SGD'
        WHEN 'HONG KONG' THEN 'HKD'
        WHEN 'THAILAND' THEN 'THB'
        WHEN 'MALAYSIA' THEN 'MYR'
        WHEN 'INDONESIA' THEN 'IDR'
        WHEN 'PHILIPPINES' THEN 'PHP'
        WHEN 'VIETNAM' THEN 'VND'
        WHEN 'BANGLADESH' THEN 'BDT'
        WHEN 'SRI LANKA' THEN 'LKR'
        WHEN 'PAKISTAN' THEN 'PKR'
        WHEN 'NEPAL' THEN 'NPR'
        WHEN 'BRAZIL' THEN 'BRL'
        WHEN 'MEXICO' THEN 'MXN'
        WHEN 'ARGENTINA' THEN 'ARS'
        WHEN 'CHILE' THEN 'CLP'
        WHEN 'COLOMBIA' THEN 'COP'
        WHEN 'SOUTH AFRICA' THEN 'ZAR'
        WHEN 'RUSSIA' THEN 'RUB'
        WHEN 'TURKEY' THEN 'TRY'
        WHEN 'ISRAEL' THEN 'ILS'
        WHEN 'SAUDI ARABIA' THEN 'SAR'
        WHEN 'UAE' THEN 'AED'
        WHEN 'UNITED ARAB EMIRATES' THEN 'AED'
        WHEN 'EGYPT' THEN 'EGP'
        WHEN 'NIGERIA' THEN 'NGN'
        WHEN 'KENYA' THEN 'KES'
        WHEN 'SWITZERLAND' THEN 'CHF'
        WHEN 'NORWAY' THEN 'NOK'
        WHEN 'SWEDEN' THEN 'SEK'
        WHEN 'DENMARK' THEN 'DKK'
        WHEN 'POLAND' THEN 'PLN'
        WHEN 'CZECH REPUBLIC' THEN 'CZK'
        WHEN 'HUNGARY' THEN 'HUF'
        WHEN 'NEW ZEALAND' THEN 'NZD'
        ELSE 'USD' -- Default to USD for unknown countries
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to auto-set currency based on country
CREATE OR REPLACE FUNCTION public.set_vendor_currency_from_country()
RETURNS TRIGGER AS $$
DECLARE
    base_currency_val TEXT;
BEGIN
    -- Get organization base currency first
    SELECT base_currency INTO base_currency_val
    FROM public.organization_settings
    LIMIT 1;
    
    -- If no organization base currency is set, use USD as default
    IF base_currency_val IS NULL THEN
        base_currency_val := 'USD';
    END IF;
    
    -- If currency is not explicitly set, determine from country
    IF NEW.currency IS NULL OR NEW.currency = 'USD' THEN
        -- If country is provided, get its currency
        IF NEW.country IS NOT NULL AND NEW.country != '' THEN
            NEW.currency := public.get_currency_for_country(NEW.country);
        ELSE
            -- Use organization base currency as fallback
            NEW.currency := base_currency_val;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_set_vendor_currency
    BEFORE INSERT OR UPDATE ON public.vendor_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_vendor_currency_from_country();