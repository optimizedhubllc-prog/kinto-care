/**
 * Phone Number Utilities - Smart International Routing
 * 
 * Handles NANP (North American Numbering Plan) detection and international
 * phone number routing for the Kinto Medical Contacts module.
 * 
 * Supports:
 * - Dominican Republic (+1-809, +1-829, +1-849)
 * - Other international numbers (country codes)
 * - Standard US numbers (+1-2XX to +1-9XX, excluding DR area codes)
 */

/**
 * Dominican Republic area codes (NANP)
 * These are part of the North American Numbering Plan but represent
 * international calls to the Dominican Republic
 */
const DOMINICAN_REPUBLIC_AREA_CODES = ["809", "829", "849"];

/**
 * Standard NANP area codes (US, Canada, etc.)
 * These are domestic or regional calls within North America
 */
const STANDARD_NANP_AREA_CODES = [
  // US area codes (sample - there are many more)
  "201", "202", "203", "205", "206", "207", "208", "209",
  "212", "213", "214", "215", "216", "217", "218", "219",
  "301", "302", "303", "304", "305", "306", "307", "308", "309",
  "310", "312", "313", "314", "315", "316", "317", "318", "319",
  "401", "402", "403", "404", "405", "406", "407", "408", "409",
  "410", "412", "413", "414", "415", "416", "417", "418", "419",
  "501", "502", "503", "504", "505", "506", "507", "508", "509",
  "510", "512", "513", "514", "515", "516", "517", "518", "519",
  "601", "602", "603", "604", "605", "606", "607", "608", "609",
  "610", "612", "613", "614", "615", "616", "617", "618", "619",
  "701", "702", "703", "704", "705", "706", "707", "708", "709",
  "710", "712", "713", "714", "715", "716", "717", "718", "719",
  "801", "802", "803", "804", "805", "806", "807", "808", "809",
  "810", "812", "813", "814", "815", "816", "817", "818", "819",
  "901", "902", "903", "904", "905", "906", "907", "908", "909",
  "910", "912", "913", "914", "915", "916", "917", "918", "919",
];

/**
 * International country codes (non-NANP)
 * Maps country code to country name for reference
 */
const INTERNATIONAL_COUNTRY_CODES: Record<string, string> = {
  "44": "United Kingdom",
  "33": "France",
  "49": "Germany",
  "39": "Italy",
  "34": "Spain",
  "31": "Netherlands",
  "32": "Belgium",
  "41": "Switzerland",
  "43": "Austria",
  "45": "Denmark",
  "46": "Sweden",
  "47": "Norway",
  "48": "Poland",
  "52": "Mexico",
  "55": "Brazil",
  "56": "Chile",
  "57": "Colombia",
  "58": "Venezuela",
  "591": "Bolivia",
  "592": "Guyana",
  "593": "Ecuador",
  "594": "French Guiana",
  "595": "Paraguay",
  "598": "Uruguay",
  "51": "Peru",
  "54": "Argentina",
  "61": "Australia",
  "64": "New Zealand",
  "81": "Japan",
  "82": "South Korea",
  "86": "China",
  "91": "India",
  "92": "Pakistan",
  "93": "Afghanistan",
  "94": "Sri Lanka",
  "95": "Myanmar",
  "98": "Iran",
  "212": "Morocco",
  "213": "Algeria",
  "216": "Tunisia",
  "220": "Senegal",
  "234": "Nigeria",
  "254": "Kenya",
  "256": "Uganda",
  "27": "South Africa",
  "971": "United Arab Emirates",
  "966": "Saudi Arabia",
  "972": "Israel",
  "90": "Turkey",
  "380": "Ukraine",
  "7": "Russia",
};

/**
 * Detects if a phone number is from the Dominican Republic
 * 
 * @param phoneNumber - Phone number string (can include +, -, spaces, parentheses)
 * @returns true if the number is a Dominican Republic number
 * 
 * @example
 * isDominicanRepublic("+1-809-555-1234") // true
 * isDominicanRepublic("+1-829-555-1234") // true
 * isDominicanRepublic("+1-849-555-1234") // true
 * isDominicanRepublic("+1-212-555-1234") // false
 */
export function isDominicanRepublic(phoneNumber: string): boolean {
  const cleaned = cleanPhoneNumber(phoneNumber);
  
  // Check if it starts with +1 followed by DR area codes
  if (cleaned.startsWith("+1")) {
    const areaCode = cleaned.substring(2, 5);
    return DOMINICAN_REPUBLIC_AREA_CODES.includes(areaCode);
  }
  
  return false;
}

/**
 * Detects if a phone number is international (non-US)
 * 
 * @param phoneNumber - Phone number string
 * @returns true if the number is international
 * 
 * @example
 * isInternationalNumber("+44-20-7946-0958") // true (UK)
 * isInternationalNumber("+1-809-555-1234") // true (Dominican Republic)
 * isInternationalNumber("+1-212-555-1234") // false (US)
 */
export function isInternationalNumber(phoneNumber: string): boolean {
  const cleaned = cleanPhoneNumber(phoneNumber);
  
  // If it doesn't start with +, assume it's not international
  if (!cleaned.startsWith("+")) {
    return false;
  }
  
  // Extract country code
  const countryCodeMatch = cleaned.match(/^\+(\d{1,3})/);
  if (!countryCodeMatch) {
    return false;
  }
  
  const countryCode = countryCodeMatch[1];
  
  // If it's +1 (NANP), check if it's Dominican Republic
  if (countryCode === "1") {
    return isDominicanRepublic(phoneNumber);
  }
  
  // If it's any other country code, it's international
  return true;
}

/**
 * Cleans a phone number by removing common formatting characters
 * 
 * @param phoneNumber - Phone number string with any formatting
 * @returns Cleaned phone number with only + and digits
 * 
 * @example
 * cleanPhoneNumber("+1 (809) 555-1234") // "+18095551234"
 * cleanPhoneNumber("+1-809-555-1234") // "+18095551234"
 */
export function cleanPhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/[\s\-()]/g, "");
}

/**
 * Formats a phone number for WhatsApp URL
 * WhatsApp requires the number in international format without + or spaces
 * 
 * @param phoneNumber - Phone number string
 * @returns Formatted number for WhatsApp (e.g., "18095551234")
 * 
 * @example
 * formatWhatsAppLink("+1-809-555-1234") // "18095551234"
 * formatWhatsAppLink("+44-20-7946-0958") // "442079460958"
 */
export function formatWhatsAppLink(phoneNumber: string): string {
  const cleaned = cleanPhoneNumber(phoneNumber);
  // Remove the + prefix if present
  return cleaned.replace(/^\+/, "");
}

/**
 * Generates a WhatsApp message URL
 * 
 * @param phoneNumber - Phone number string
 * @param message - Optional message to pre-fill (URL encoded)
 * @returns WhatsApp URL
 * 
 * @example
 * getWhatsAppUrl("+1-809-555-1234")
 * // "https://wa.me/18095551234"
 * 
 * getWhatsAppUrl("+1-809-555-1234", "Hello!")
 * // "https://wa.me/18095551234?text=Hello%21"
 */
export function getWhatsAppUrl(phoneNumber: string, message?: string): string {
  const formatted = formatWhatsAppLink(phoneNumber);
  const baseUrl = `https://wa.me/${formatted}`;
  
  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }
  
  return baseUrl;
}

/**
 * Gets the country name for an international number
 * 
 * @param phoneNumber - Phone number string
 * @returns Country name or null if not found
 * 
 * @example
 * getCountryName("+44-20-7946-0958") // "United Kingdom"
 * getCountryName("+1-809-555-1234") // "Dominican Republic"
 */
export function getCountryName(phoneNumber: string): string | null {
  const cleaned = cleanPhoneNumber(phoneNumber);
  
  if (!cleaned.startsWith("+")) {
    return null;
  }
  
  // Check Dominican Republic first
  if (isDominicanRepublic(phoneNumber)) {
    return "Dominican Republic";
  }
  
  // Extract country code (1-3 digits)
  const countryCodeMatch = cleaned.match(/^\+(\d{1,3})/);
  if (!countryCodeMatch) {
    return null;
  }
  
  const countryCode = countryCodeMatch[1];
  return INTERNATIONAL_COUNTRY_CODES[countryCode] || null;
}

/**
 * Validates if a phone number is properly formatted
 * 
 * @param phoneNumber - Phone number string
 * @returns true if the number appears to be valid
 * 
 * @example
 * isValidPhoneNumber("+1-809-555-1234") // true
 * isValidPhoneNumber("+44-20-7946-0958") // true
 * isValidPhoneNumber("invalid") // false
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const cleaned = cleanPhoneNumber(phoneNumber);
  
  // Must start with + and have at least 10 digits total
  if (!cleaned.startsWith("+")) {
    return false;
  }
  
  // Extract just the digits
  const digitsOnly = cleaned.replace(/\D/g, "");
  
  // Should have between 10 and 15 digits (international standard)
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}
