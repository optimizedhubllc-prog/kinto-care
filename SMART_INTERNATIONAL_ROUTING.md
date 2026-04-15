# Smart International Routing (NANP Aware) - Feature Documentation

## Overview

Kinto Beta 1.2 introduces **Smart International Routing** for Medical Contacts, enabling seamless coordination with healthcare providers across international borders—especially for the Dominican Republic and other countries.

## Problem Statement

Family caregivers coordinating care across borders face challenges:
- **Accidental International Charges**: Unexpected carrier fees for international calls
- **Communication Barriers**: Different communication preferences by region
- **Provider Coordination**: Healthcare providers in other countries may prefer messaging apps

## Solution: Smart International Routing

The Medical Contacts module now intelligently detects phone numbers and routes them appropriately:

### **Routing Logic**

| Number Type | Detection | Action | Use Case |
|------------|-----------|--------|----------|
| **US Numbers** | +1 with area codes 2XX-9XX (excluding DR) | Display as `tel:` link | Standard phone calls |
| **Dominican Republic** | +1-809, +1-829, +1-849 | WhatsApp button + badge | International coordination |
| **Other International** | Non-+1 country codes (+44, +33, +52, etc.) | WhatsApp button + info box | Global coordination |

### **User Experience**

#### Standard US Numbers (+1-212-555-1234)
- Phone number displays as clickable `tel:` link (blue, underlined)
- Tapping initiates standard phone call
- No WhatsApp button shown

#### Dominican Republic Numbers (+1-809-555-1234)
- Phone number displays as plain text
- **Amber badge** indicates "Dominican Republic"
- **Green WhatsApp button** with messaging icon
- **Info box** explains: "Use WhatsApp to avoid international calling charges"
- Clicking WhatsApp button opens `https://wa.me/18095551234`

#### Other International Numbers (+44-20-7946-0958)
- Phone number displays as plain text
- **Green WhatsApp button** with messaging icon
- **Blue info box** shows country name: "Use WhatsApp to avoid international calling charges. This contact is in United Kingdom."
- Clicking WhatsApp button opens `https://wa.me/442079460958`

## Technical Implementation

### **Phone Utilities Library** (`client/src/lib/phoneUtils.ts`)

Core functions for international phone number handling:

```typescript
// Detect Dominican Republic numbers
isDominicanRepublic("+1-809-555-1234") // true
isDominicanRepublic("+1-212-555-1234") // false

// Detect any international number
isInternationalNumber("+44-20-7946-0958") // true
isInternationalNumber("+1-212-555-1234") // false

// Format for WhatsApp URLs
getWhatsAppUrl("+1-809-555-1234") // "https://wa.me/18095551234"

// Get country name
getCountryName("+1-809-555-1234") // "Dominican Republic"
getCountryName("+44-20-7946-0958") // "United Kingdom"

// Validate phone numbers
isValidPhoneNumber("+1-809-555-1234") // true

// Clean formatting
cleanPhoneNumber("+1 (809) 555-1234") // "+18095551234"
```

### **Medical Contacts Component** (`client/src/pages/MedicalContacts.tsx`)

Updated to use phone utilities for smart routing:

```typescript
import { 
  isInternationalNumber, 
  isDominicanRepublic, 
  getWhatsAppUrl, 
  getCountryName 
} from "@/lib/phoneUtils";

// Conditional rendering
{isInternationalNumber(contact.phone) ? (
  <p>{contact.phone}</p> // Plain text for international
) : (
  <a href={`tel:${contact.phone}`}>{contact.phone}</a> // tel: link for US
)}

// WhatsApp button for international
{isInternationalNumber(contact.phone) && (
  <a href={getWhatsAppUrl(contact.phone)} target="_blank">
    Message via WhatsApp
  </a>
)}

// DR badge
{isDominicanRepublic(contact.phone) && (
  <div>Dominican Republic</div>
)}
```

## Supported Country Codes

The system supports 40+ international country codes including:

**Americas:**
- +1: Canada, US, Dominican Republic (809/829/849)
- +52: Mexico
- +55: Brazil
- +56: Chile
- +57: Colombia

**Europe:**
- +44: United Kingdom
- +33: France
- +49: Germany
- +39: Italy
- +34: Spain

**Asia-Pacific:**
- +81: Japan
- +82: South Korea
- +86: China
- +91: India
- +61: Australia

**Africa & Middle East:**
- +27: South Africa
- +234: Nigeria
- +966: Saudi Arabia
- +971: United Arab Emirates

[Full list in `phoneUtils.ts` INTERNATIONAL_COUNTRY_CODES]

## RBAC & Security

- **Family Admin Only**: Can add/edit medical contacts with international numbers
- **All Members**: Can view contacts and access WhatsApp links
- **No Sensitive Data**: Phone numbers are stored as plain text; WhatsApp links are generated client-side
- **HTTPS Only**: All WhatsApp links use secure HTTPS protocol

## Mobile Responsiveness

- **44px Touch Targets**: All buttons meet accessibility standards
- **Responsive Layout**: Adapts to mobile, tablet, desktop
- **Bottom Navigation**: Mobile-optimized navigation bar
- **Glassmorphism**: Frosted glass effect on mobile nav

## Beta Testing with Jaquez Family

### **Test Scenarios**

1. **Dominican Republic Provider**
   - Add contact: Dr. García, +1-809-555-1234
   - Verify: Amber badge appears, WhatsApp button shows
   - Action: Click WhatsApp button, verify `wa.me/18095551234` opens

2. **US Provider**
   - Add contact: Dr. Smith, +1-212-555-1234
   - Verify: No badge, no WhatsApp button
   - Action: Click phone number, verify tel: link initiates call

3. **International Provider**
   - Add contact: Dr. Müller, +49-30-123-4567 (Germany)
   - Verify: Green WhatsApp button, "Germany" shown in info box
   - Action: Click WhatsApp button, verify `wa.me/493012345678` opens

### **Success Criteria**

✅ Dominican Republic numbers show WhatsApp button  
✅ US numbers show tel: links only  
✅ Other international numbers show WhatsApp button + country name  
✅ No accidental international charges from tel: links  
✅ WhatsApp links work on mobile and desktop  
✅ All buttons have 44px+ touch targets  

## Deployment Notes

- **No Backend Changes**: Feature is client-side only
- **No Database Changes**: Phone number format unchanged
- **Backward Compatible**: Existing contacts work without modification
- **No New Dependencies**: Uses native browser APIs

## Future Enhancements

1. **SMS Fallback**: For providers without WhatsApp
2. **Call Scheduling**: Integration with calendar for WhatsApp calls
3. **Message Templates**: Pre-filled messages for common coordination tasks
4. **Provider Preferences**: Let providers choose preferred communication channel
5. **Multi-Language**: Localize info boxes and UI text

## Support & Troubleshooting

**WhatsApp link not opening?**
- Verify phone number format includes country code (+)
- Check WhatsApp is installed on device
- Try opening link in browser first

**Wrong country detected?**
- Verify phone number format: +[country code]-[area code]-[number]
- Check country code in INTERNATIONAL_COUNTRY_CODES

**tel: link not working?**
- Verify phone number is valid US format (+1-XXX-XXX-XXXX)
- Check device has phone capability enabled

## Contact

For questions or issues with Smart International Routing, contact the Kinto development team.

---

**Feature Version**: 1.0  
**Release Date**: April 2026  
**Status**: Beta (Jaquez Family Testing)
