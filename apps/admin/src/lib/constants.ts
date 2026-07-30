// Shared static data constants for forms and configurations

export interface TimezoneOption {
  value: string;
  label: string;
}

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  placeholder?: string;
}

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const TIMEZONES: TimezoneOption[] = [
  { value: "Europe/Bucharest", label: "(GMT+02:00) Bucharest" },
  { value: "Europe/Stockholm", label: "(GMT+01:00) Stockholm" },
  { value: "Europe/London", label: "(GMT+00:00) London" },
  { value: "Europe/Paris", label: "(GMT+01:00) Paris" },
  { value: "America/New_York", label: "(GMT-05:00) Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "(GMT-06:00) Central Time (US & Canada)" },
  { value: "America/Denver", label: "(GMT-07:00) Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "(GMT-08:00) Pacific Time (US & Canada)" },
  { value: "Asia/Kolkata", label: "(GMT+05:30) India Standard Time" },
  { value: "UTC", label: "(GMT+00:00) Coordinated Universal Time" },
];

export const COUNTRIES: CountryOption[] = [
  { code: "RO", name: "Romania", dialCode: "+40", placeholder: "712 345 678" },
  { code: "SE", name: "Sweden", dialCode: "+46", placeholder: "70 123 45 67" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", placeholder: "7911 123456" },
  { code: "FR", name: "France", dialCode: "+33", placeholder: "6 12 34 56 78" },
  { code: "DE", name: "Germany", dialCode: "+49", placeholder: "151 23456789" },
  { code: "IT", name: "Italy", dialCode: "+39", placeholder: "312 345 6789" },
  { code: "ES", name: "Spain", dialCode: "+34", placeholder: "612 34 56 78" },
  { code: "US", name: "United States", dialCode: "+1", placeholder: "(555) 234-5678" },
  { code: "CA", name: "Canada", dialCode: "+1", placeholder: "(555) 234-5678" },
  { code: "IN", name: "India", dialCode: "+91", placeholder: "98765 43210" },
];

export const CURRENCIES: CurrencyOption[] = [
  { code: "EUR", name: "Euro (€)", symbol: "€" },
  { code: "RON", name: "Romanian Leu (RON)", symbol: "lei" },
  { code: "SEK", name: "Swedish Krona (SEK)", symbol: "kr" },
  { code: "GBP", name: "British Pound (£)", symbol: "£" },
  { code: "USD", name: "US Dollar ($)", symbol: "$" },
  { code: "INR", name: "Indian Rupee (₹)", symbol: "₹" },
];

export const TREATMENT_CATEGORIES: string[] = [
  "Acne",
  "Arm flaps",
  "Arm pits",
  "Arms",
  "Back",
  "Belly",
  "Bikini area",
  "Bunny lines",
  "Buttocks",
  "Cheeks",
  "Cheekbones",
  "Chest",
  "Chin",
  "Chin cleft",
  "Collagen",
  "Crow's feet",
  "Double chin",
  "Elasticity",
  "Eyebrows",
  "Eyes",
  "Face",
  "Feet",
  "Fine lines",
  "Frown lines",
  "Hair",
  "Hands",
  "Hydration",
  "Hyperpigmentation",
  "Inner thighs",
  "Jawline",
  "Jowls",
  "Legs",
  "Lip flip",
  "Lip lines",
  "Lips",
  "Low energy",
  "Love handles",
  "Marionette lines",
  "Mood",
  "Nails",
  "Neck",
  "Neck bands",
  "Nose",
  "Outer thighs",
  "Pore shrinking",
  "Redness",
  "Rosecea",
  "Scarring",
  "Skin-tightening",
  "Smile lines",
  "Smoothness",
  "Sun damage",
  "Teeth",
  "Temples",
  "Texture",
  "Upper legs",
  "Veins",
  "Wrinkles",
];
