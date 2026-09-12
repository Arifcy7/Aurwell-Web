# 🗄️ Aurwell Firebase Database Schema

This document is the single source of truth for all Firestore and Realtime Database structures used across the Aurwell platform. It reflects the exact fields read and written by the admin panel, patient mobile app, and clinic public booking web portals.

---

## 🗺️ Collection Hierarchy

```
/users (root collection)
    └── {uid} (user document)

/clinics (root collection)
    └── {clinicId} (clinic config document)
         ├── /treatments
         │     └── {treatmentId}
         ├── /membership_tiers              ← collection name (NOT "memberships")
         │     └── {tierId}
         ├── /rewards
         │     └── {rewardId}
         ├── /settings
         │     └── rewards_ratio            ← fixed document ID
         ├── /blogs
         │     └── {blogId}
         ├── /banners
         │     └── {bannerId}
         ├── /automated_offers
         │     └── {offerId}
         ├── /patients
         │     └── {patientId}
         │           └── /availed_rewards
         │                 └── {availedRewardId}
         ├── /transactions
         │     └── {transactionId}
         ├── /active_memberships
         │     └── {memberId}
         ├── /doctors                       ← [BOOKING MODULE]
         │     └── {doctorId}
         ├── /schedules                     ← [BOOKING MODULE]
         │     ├── operating_hours          ← fixed document ID (clinic-level)
         │     └── doctor_{doctorId}        ← per-doctor shift schedules
         ├── /blocked_slots                 ← [BOOKING MODULE]
         │     └── {slotId}
         └── /appointments                  ← [BOOKING MODULE]
               └── {appointmentId}

/subdomains (root collection)               ← [BOOKING MODULE - Subdomain to Clinic Lookup]
    └── {subdomain}

/referrals (root collection)
    └── {referralCode}

/b2b_referrals (root collection)
    └── {referralId}

/admin (root collection)                       ← [SUPER ADMIN ACCESS LIST]
    └── {adminDocId}
```

---

## 📑 Detailed Collection Specifications

### 1. Root Collection: `users`
Stores user profile mapping and security role metadata.

- **Path**: `/users/{uid}`
- **Document ID**: `uid` (matching Firebase Authentication User ID)

| Field | Type | Description |
|---|---|---|
| `uid` | `string` | Firebase Authentication User ID |
| `firstName` | `string` | User's first name |
| `lastName` | `string` | User's last name |
| `email` | `string` | Primary email address |
| `role` | `string` | RBAC role — always `"clinic_admin"` for admin users |
| `clinicId` | `string` | Associated clinic document ID (maps to `/clinics/{clinicId}`) |
| `createdAt` | `timestamp` | Account creation timestamp |
| `fcmTokens` | `array` of `string` | FCM device push tokens (added by mobile app on login) |

---

### 2. Root Collection: `clinics`
Base branding, settings, profile, and booking configuration for each clinic tenant.

- **Path**: `/clinics/{clinicId}`
- **Document ID format**: `clinic_{ownerUid}`

| Field | Type | Description |
|---|---|---|
| `clinicId` | `string` | Tenant identifier — same as the document ID |
| `ownerUid` | `string` | Firebase Auth UID of the clinic owner |
| `merchantName` | `string` | Public display name of the clinic |
| `description` | `string` | Public clinic bio / service description |
| `logoUrl` | `string` | Clinic logo image URL (Firebase Storage) |
| `appHeroImageUrl` | `string` | Mobile app home screen hero banner image URL |
| `brandColor` | `string` | Hex colour for white-label app theming (e.g. `"#C9A96E"`) |
| `websiteUrl` | `string` | External clinic website URL (optional) |
| `treatmentList` | `array` of `string` | High-level treatment type tags (e.g. `["Botox", "Laser"]`) |
| `currency` | `string` | ISO currency code (e.g. `"GBP"`, `"EUR"`, `"USD"`, `"RON"`, `"SEK"`, `"INR"`) |
| `timezone` | `string` | IANA timezone (e.g. `"Europe/London"`) |
| `country` | `string` | ISO 2-char country code (e.g. `"GB"`) |
| `address` | `string` | Street address string |
| `postalCode` | `string` | Postal / ZIP code |
| `phone` | `string` | Contact phone number including dial code (e.g. `"+44 20 7946 0813"`) |
| `googleMapUrl` | `string` | Google Maps URL for the clinic location (optional) |
| `latitude` | `number` | Latitude extracted automatically from `googleMapUrl` |
| `longitude` | `number` | Longitude extracted automatically from `googleMapUrl` |
| `blogSectionTitle` | `string` | Custom label for the blogs tab in the mobile app (default: `"Blogs"`) |
| `createdAt` | `timestamp` | Clinic provisioning timestamp |
| `stripe` | `object` (optional) | Tenant Stripe integration metadata — see schema below |
| `bookingConfig` | `object` (optional) | **[NEW]** Tenant booking engine configuration & subdomain flags — see schema below |

#### `stripe` item schema:
```json
{
  "enabled": "boolean  (e.g. true)",
  "publishableKey": "string  (e.g. pk_live_...)",
  "accountId": "string  (e.g. acct_...)",
  "secretKeyName": "string  (Google Secret Manager resource reference)",
  "webhookSecretName": "string | null  (Google Secret Manager resource reference)",
  "defaultCurrency": "string  (e.g. GBP)",
  "country": "string  (e.g. GB)"
}
```

#### `bookingConfig` item schema:
```json
{
  "systemType": "string  (\"aurwell_custom\" | \"external_sdk\" | \"disabled\")",
  "subdomain": "string  (unique prefix, e.g. \"harleystreet\")",
  "customDomain": "string | null  (e.g. \"booking.harleystreetclinic.com\")",
  "externalBooking": {
    "provider": "string  (e.g. \"fresha\", \"phorest\", \"custom_link\")",
    "url": "string  (external booking portal URL)"
  },
  "settings": {
    "requirePaymentUpfront": "boolean  (whether public bookings require Stripe payment/deposit)",
    "depositType": "string  (\"full\" | \"percentage\" | \"fixed\")",
    "depositAmount": "number  (deposit percentage e.g. 50, or fixed currency amount e.g. 50.0)",
    "slotIntervalMinutes": "number  (slot search increment, e.g. 15 or 30 mins, default: 15)",
    "minNoticeHours": "number  (minimum hours advance notice for booking, default: 2)",
    "maxAdvanceDays": "number  (maximum days in future bookable, default: 60)",
    "cancellationHours": "number  (free cancellation window in hours, default: 24)",
    "holdDurationMinutes": "number  (temporary checkout lock duration in minutes, default: 10)"
  }
}
```

> **Deprecated legacy fields** (still read with fallback for backwards compatibility):
> - `heroBannerUrl` — superseded by `appHeroImageUrl`
> - `primaryColor` — superseded by `brandColor`
> - `address` as a nested object `{ street, city, postalCode, phone }` — superseded by flat string fields

---

### 3. System Constants: Treatment Categories
Treatment categories are system-wide fixed tags (not stored in Firestore; defined in `src/lib/constants.ts`). A treatment document may belong to **multiple categories** simultaneously.

**58 predefined categories**: `Acne`, `Arm flaps`, `Arm pits`, `Arms`, `Back`, `Belly`, `Bikini area`, `Bunny lines`, `Buttocks`, `Cheeks`, `Cheekbones`, `Chest`, `Chin`, `Chin cleft`, `Collagen`, `Crow's feet`, `Double chin`, `Elasticity`, `Eyebrows`, `Eyes`, `Face`, `Feet`, `Fine lines`, `Frown lines`, `Hair`, `Hands`, `Hydration`, `Hyperpigmentation`, `Inner thighs`, `Jawline`, `Jowls`, `Legs`, `Lip flip`, `Lip lines`, `Lips`, `Low energy`, `Love handles`, `Marionette lines`, `Mood`, `Nails`, `Neck`, `Neck bands`, `Nose`, `Outer thighs`, `Pore shrinking`, `Redness`, `Rosecea`, `Scarring`, `Skin-tightening`, `Smile lines`, `Smoothness`, `Sun damage`, `Teeth`, `Temples`, `Texture`, `Upper legs`, `Veins`, `Wrinkles`.

---

### 4. Subcollection: `treatments`
Clinic service products with pricing variants, duration, and buffer settings.

- **Path**: `/clinics/{clinicId}/treatments/{treatmentId}`
- **Document ID**: Firestore auto-generated

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Treatment name (e.g. `"Botox Anti-Wrinkle Injections"`) |
| `categories` | `array` of `string` | List of assigned category tag titles (e.g. `["Face", "Wrinkles", "Frown lines"]`) |
| `description` | `string` | Full treatment description shown in the mobile app & web |
| `bannerUrl` | `string` | Treatment banner image URL |
| `featuresHeading` | `string` | Section heading for the features list (e.g. `"Key Benefits"`) |
| `features` | `array` of `string` | Feature / benefit bullet points |
| `durationMinutes` | `number` | **[NEW]** Service duration in minutes (e.g. `30`, `45`, `60`) — displayed in patient booking portal & used to calculate calendar slot intervals |
| `bufferMinutes` | `number` | **[NEW]** Post-service room prep / buffer window in minutes (default: `15`) |
| `depositRequired` | `boolean \| null` | **[NEW]** Optional treatment-level deposit requirement override |
| `types` | `array` of `object` | Pricing variants — see schema below |
| `isActive` | `boolean` | Whether this treatment is visible in patient apps & public booking |
| `createdAt` | `timestamp` | Document creation timestamp |

#### `types` item schema:
```json
{
  "title": "string  (e.g. Full Face)",
  "nonMemberPrice": "number  (e.g. 295)",
  "memberPrice": "number | null  (e.g. 240, or null if not set)"
}
```

#### Example Treatment Document:
```json
{
  "title": "PRP Hair Restoration",
  "categories": ["Hair", "Skin-tightening"],
  "description": "Platelet-Rich Plasma (PRP) therapy harnesses the healing power of your own blood to stimulate dormant hair follicles.",
  "bannerUrl": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600",
  "featuresHeading": "Key Benefits",
  "features": ["Stimulates natural regrowth", "Non-surgical", "Zero downtime"],
  "durationMinutes": 30,
  "bufferMinutes": 15,
  "depositRequired": null,
  "types": [
    { "title": "Single Session", "nonMemberPrice": 385, "memberPrice": 320 },
    { "title": "Course of 3 Sessions", "nonMemberPrice": 995, "memberPrice": 850 }
  ],
  "isActive": true,
  "createdAt": "Timestamp"
}
```

---

### 5. Subcollection: `membership_tiers`
Recurring subscription plans with bundled treatment sessions.

- **Path**: `/clinics/{clinicId}/membership_tiers/{tierId}`
- **Document ID**: Firestore auto-generated
- **⚠️ Important**: The collection name is `membership_tiers` — NOT `memberships`.

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Tier name (e.g. `"Prestige Elite"`) |
| `description` | `string` | Short tagline shown on the tier card |
| `monthlyPrice` | `number` | Monthly subscription price |
| `annualPrice` | `number \| null` | Annual subscription price (optional) |
| `minCommitmentMonths` | `number \| null` | Minimum commitment period in months (e.g. `3`, `6`, `12`) |
| `benefits` | `array` of `string` | Member perk bullet points |
| `includedTreatments` | `array` of `object` | Bundled treatment sessions (`[{ treatmentId, sessionsCount }]`) |
| `imageUrl` | `string` | Tier cover / card banner image URL |
| `terms` | `string` | Membership terms and conditions text |
| `isActive` | `boolean` | Whether the tier is visible and purchasable |
| `createdAt` | `timestamp` | Document creation timestamp |

---

### 6. Subcollection: `rewards`
Point-redemption discount coupons.

- **Path**: `/clinics/{clinicId}/rewards/{rewardId}`
- **Document ID**: Firestore auto-generated

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Reward name (e.g. `"HydraFacial Loyalty Reward"`) |
| `description` | `string` | Explanation of the reward |
| `cardInfo` | `string` | Short badge text (e.g. `"10% OFF"`, `"FREE"`) |
| `pointsRequired` | `number` | Points needed to unlock this reward |
| `treatmentId` | `string` | Target treatment document ID the discount applies to |
| `discountPercentage` | `number` | Discount percentage applied at checkout |
| `discountUpTo` | `number \| null` | Maximum currency cap for the discount |
| `expiryDays` | `number \| null` | Days valid after redemption |
| `isActive` | `boolean` | Active toggle |
| `createdAt` | `timestamp` | Document creation timestamp |

---

### 7. Subcollection: `settings` — Rewards Ratio Document
- **Path**: `/clinics/{clinicId}/settings/rewards_ratio`
- **Document ID**: `rewards_ratio` (fixed)

| Field | Type | Description |
|---|---|---|
| `spendAmount` | `number` | Base spend threshold (e.g. `10`) |
| `pointsEarned` | `number` | Points awarded per threshold (e.g. `1`) |
| `firstVisitPoints` | `number` | First check-in bonus |
| `googleReviewPoints` | `number` | Google review bonus |
| `referralPoints` | `number` | Successful referral bonus |

---

### 8. Subcollection: `blogs`
- **Path**: `/clinics/{clinicId}/blogs/{blogId}`
- **Document ID**: Firestore auto-generated

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Article title |
| `description` | `string` | Summary snippet |
| `imageUrl` | `string` | Cover image URL |
| `articleUrl` | `string` | Full external article URL |
| `isActive` | `boolean` | Active toggle |
| `createdAt` | `timestamp` | Creation timestamp |

---

### 9. Subcollection: `banners`
- **Path**: `/clinics/{clinicId}/banners/{bannerId}`
- **Document ID**: Firestore auto-generated

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Banner headline |
| `imageUrl` | `string` | Banner image URL |
| `targetType` | `string` | `"treatment"` or `"link"` |
| `targetId` | `string` | Treatment doc ID or external URL |
| `isActive` | `boolean` | Active toggle |
| `createdAt` | `timestamp` | Creation timestamp |

---

### 10. Subcollection: `automated_offers`
- **Path**: `/clinics/{clinicId}/automated_offers/{offerId}`
- **Document ID**: Preset identifier (e.g. `birthday_special`) or auto-generated

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique offer ID |
| `occasion` | `string` | Occasion label (e.g. `"Birthday Special"`) |
| `title` | `string` | Display title |
| `isActive` | `boolean` | Active toggle |
| `discountType` | `string` | `"percentage"` |
| `discountValue` | `number` | Discount percentage or amount |
| `maxDiscountAmount` | `number \| null` | Optional cap |
| `allProductsIncluded` | `boolean` | Whether all treatments are included |
| `includedProductIds` | `array` of `string` | Selected treatment IDs |
| `startDate` | `string \| null` | Validity start date (`"YYYY-MM-DD"`) |
| `endDate` | `string \| null` | Validity end date (`"YYYY-MM-DD"`) |
| `imageUrl` | `string \| null` | Image URL |
| `createdAt` | `timestamp` | Provisioning timestamp |
| `updatedAt` | `timestamp` | Last update timestamp |

---

### 11. Subcollection: `patients`
Registered client profiles.

- **Path**: `/clinics/{clinicId}/patients/{patientId}`
- **Document ID**: Firestore auto-generated

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Patient full name |
| `email` | `string` | Contact email |
| `phone` | `string` | Contact phone number |
| `birthDate` | `string` (optional) | Date of birth (`"DD/MM/YYYY"`) |
| `joinedAt` | `timestamp` or `string` | Registration date |
| `visitsCount` | `number` | Check-in count |
| `referralCode` | `string` | Unique code (format: `REF-{clinicId}-{uid}`) |
| `referredBy` | `string` (optional) | Referrer patient UID |
| `hasGivenGoogleReview` | `boolean` (optional) | Google review claim status |
| `stripeCustomerId` | `string` (optional) | Stripe Customer ID (`cus_...`) |

---

### 12. Subcollection: `transactions`
Payment transaction records.

- **Path**: `/clinics/{clinicId}/transactions/{transactionId}`
- **Document ID format**: `tx_{epochMs}_{uidSuffix}`

| Field | Type | Description |
|---|---|---|
| `clientName` | `string` | Payer patient name |
| `email` | `string` | Payer email |
| `userUid` | `string` | Patient Auth UID |
| `treatmentName` | `string` | Summary title |
| `items` | `array` of `object` | Line-item breakdown |
| `amount` | `number` | Charged amount |
| `subtotal` | `number` (optional) | Subtotal before discounts |
| `discountAmount` | `number` (optional) | Discount applied |
| `appliedRewardId` | `string` (optional) | Availed coupon ID |
| `type` | `string` | `"treatment"`, `"membership"`, or `"booking_deposit"` |
| `date` | `number` or `timestamp` | Timestamp |
| `status` | `string` | `"Completed"`, `"Pending"`, or `"Refunded"` |

---

### 13. Subcollection: `active_memberships`
Active patient subscription records.

- **Path**: `/clinics/{clinicId}/active_memberships/{memberId}`
- **Document ID format**: Stripe subscription ID (`sub_...`)

---

### 14. Subcollection: `doctors` 🆕
Doctor and practitioner profiles, specializations, and qualification links. Managed directly by Admin Panel.

- **Path**: `/clinics/{clinicId}/doctors/{doctorId}`
- **Document ID**: Firestore auto-generated (`doc_...`)

| Field | Type | Description |
|---|---|---|
| `doctorId` | `string` | Unique doctor identifier — matches Document ID |
| `name` | `string` | Full name (e.g. `"Dr. Sarah Jenkins"`) |
| `title` | `string` | Professional title / role (e.g. `"Senior Aesthetic Practitioner"`) |
| `email` | `string` | Contact and booking notification email |
| `phone` | `string` | Contact phone number |
| `avatarUrl` | `string` | Profile image URL (Firebase Storage) |
| `bio` | `string` | Professional bio shown on public booking portal |
| `assignedTreatments` | `array` of `string` | Treatment IDs this doctor is qualified to perform (or `["all"]`) |
| `allTreatments` | `boolean` | True if doctor performs all clinic treatments |
| `isActive` | `boolean` | Whether doctor appears in booking schedule and availability search |
| `createdAt` | `timestamp` | Provisioning timestamp |
| `updatedAt` | `timestamp` | Last update timestamp |

---

### 15. Subcollection: `schedules` 🆕
Stores clinic weekly opening hours, holiday date overrides, and doctor working shifts. Managed directly by Admin Panel.

- **Path**: `/clinics/{clinicId}/schedules/{scheduleId}`

#### A. Document ID: `operating_hours` (Clinic-Level Schedule)
- **Path**: `/clinics/{clinicId}/schedules/operating_hours`

```json
{
  "weeklyHours": {
    "monday":    { "isOpen": true,  "slots": [{ "start": "09:00", "end": "17:00" }] },
    "tuesday":   { "isOpen": true,  "slots": [{ "start": "09:00", "end": "17:00" }] },
    "wednesday": { "isOpen": true,  "slots": [{ "start": "09:00", "end": "17:00" }] },
    "thursday":  { "isOpen": true,  "slots": [{ "start": "09:00", "end": "20:00" }] },
    "friday":    { "isOpen": true,  "slots": [{ "start": "09:00", "end": "17:00" }] },
    "saturday":  { "isOpen": true,  "slots": [{ "start": "10:00", "end": "16:00" }] },
    "sunday":    { "isOpen": false, "slots": [] }
  },
  "dateOverrides": [
    {
      "date": "2026-12-25",
      "isClosed": true,
      "reason": "Christmas Day"
    },
    {
      "date": "2026-12-31",
      "isClosed": false,
      "slots": [{ "start": "09:00", "end": "13:00" }],
      "reason": "New Year's Eve Early Close"
    }
  ],
  "updatedAt": "timestamp"
}
```

#### B. Document ID: `doctor_{doctorId}` (Per-Doctor Working Shifts)
- **Path**: `/clinics/{clinicId}/schedules/doctor_{doctorId}`

```json
{
  "doctorId": "doc_8231",
  "weeklyHours": {
    "monday":    { "isWorking": true,  "shifts": [{ "start": "09:00", "end": "13:00" }, { "start": "14:00", "end": "17:00" }] },
    "tuesday":   { "isWorking": true,  "shifts": [{ "start": "09:00", "end": "17:00" }] },
    "wednesday": { "isWorking": false, "shifts": [] },
    "thursday":  { "isWorking": true,  "shifts": [{ "start": "12:00", "end": "20:00" }] },
    "friday":    { "isWorking": true,  "shifts": [{ "start": "09:00", "end": "17:00" }] },
    "saturday":  { "isWorking": false, "shifts": [] },
    "sunday":    { "isWorking": false, "shifts": [] }
  },
  "updatedAt": "timestamp"
}
```

---

### 16. Subcollection: `blocked_slots` 🆕
Doctor leave, vacation, personal breaks, or emergency clinic room closures. Managed directly by Admin Panel.

- **Path**: `/clinics/{clinicId}/blocked_slots/{slotId}`
- **Document ID**: Firestore auto-generated (`block_...`)

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Block document identifier |
| `doctorId` | `string \| null` | Doctor ID affected (or `null` if entire clinic is blocked) |
| `scope` | `string` | `"doctor"` or `"clinic"` |
| `startDateTime` | `string` | ISO 8601 start timestamp (e.g. `"2026-10-10T09:00:00Z"`) |
| `endDateTime` | `string` | ISO 8601 end timestamp (e.g. `"2026-10-15T18:00:00Z"`) |
| `type` | `string` | `"leave"`, `"break"`, or `"clinic_closure"` |
| `reason` | `string` | Short description (e.g. `"Annual Medical Conference"`) |
| `createdAt` | `timestamp` | Creation timestamp |

---

### 17. Subcollection: `appointments` 🆕
Appointment records, reservation holds, payment details, and patient booking details. Written by Booking Backend & Admin Panel.

- **Path**: `/clinics/{clinicId}/appointments/{appointmentId}`
- **Document ID format**: `apt_{epochMs}_{randomSuffix}` or auto-generated

| Field | Type | Description |
|---|---|---|
| `appointmentId` | `string` | Unique appointment ID |
| `clinicId` | `string` | Clinic tenant identifier |
| `doctorId` | `string` | Assigned doctor ID |
| `doctorName` | `string` | Doctor display name snapshot |
| `patient` | `object` | Patient contact info — see schema below |
| `treatment` | `object` | Treatment snapshot — see schema below |
| `schedule` | `object` | Date and time block — see schema below |
| `status` | `string` | Lifecycle: `"held"`, `"pending_payment"`, `"confirmed"`, `"completed"`, `"cancelled"`, `"no_show"`, `"expired"` |
| `bookingSource` | `string` | `"public_web"`, `"mobile_app"`, or `"admin_staff"` |
| `holdExpiresAt` | `timestamp \| null` | Temporary 10-minute reservation lock during Stripe checkout |
| `payment` | `object` | Payment transaction snapshot — see schema below |
| `cancellation` | `object` | Cancellation metadata — see schema below |
| `createdAt` | `timestamp` | Creation timestamp |
| `updatedAt` | `timestamp` | Last update timestamp |

#### `patient` schema:
```json
{
  "patientId": "string | null  (Firestore patient ID if registered user, else null)",
  "name": "string  (e.g. Sarah Miller)",
  "email": "string  (e.g. sarah.miller@example.com)",
  "phone": "string  (e.g. +44 7700 900123)",
  "notes": "string | null  (patient notes or medical alerts)"
}
```

#### `treatment` schema:
```json
{
  "treatmentId": "string  (Firestore treatment ID)",
  "title": "string  (e.g. HydraFacial Deluxe)",
  "variantTitle": "string  (e.g. Full Face & Neck)",
  "price": "number  (e.g. 180.0)",
  "durationMinutes": "number  (e.g. 45)",
  "bufferMinutes": "number  (e.g. 15)"
}
```

#### `schedule` schema:
```json
{
  "startDateTime": "string  (ISO 8601, e.g. 2026-09-18T10:00:00Z)",
  "endDateTime": "string  (ISO 8601, e.g. 2026-09-18T10:45:00Z)",
  "slotEndDateTimeWithBuffer": "string  (ISO 8601, e.g. 2026-09-18T11:00:00Z)",
  "timezone": "string  (e.g. Europe/London)"
}
```

#### `payment` schema:
```json
{
  "required": "boolean  (true if deposit/payment was required)",
  "status": "string  (\"not_required\" | \"pending\" | \"paid\" | \"partially_paid\" | \"refunded\")",
  "amountPaid": "number  (amount paid via Stripe)",
  "depositType": "string  (\"full\" | \"percentage\" | \"fixed\")",
  "currency": "string  (e.g. GBP)",
  "stripePaymentIntentId": "string | null  (e.g. pi_3MtwBwLkdIwHu7ix28a3tqPa)",
  "stripeCustomerId": "string | null  (e.g. cus_991823)",
  "transactionId": "string | null  (linked transaction record ID)"
}
```

#### `cancellation` schema:
```json
{
  "isCancelled": "boolean",
  "cancelledAt": "timestamp | null",
  "cancelledBy": "string | null  (\"patient\" | \"clinic_staff\" | \"system_timeout\")",
  "reason": "string | null"
}
```

---

### 18. Root Collection: `subdomains` 🆕
Fast $O(1)$ tenant resolution for public booking web traffic (`clinicname.aurwell.app`).

- **Path**: `/subdomains/{subdomain}`
- **Document ID**: `subdomain` (e.g. `harleystreet`)

| Field | Type | Description |
|---|---|---|
| `subdomain` | `string` | Subdomain key (e.g. `"harleystreet"`) |
| `clinicId` | `string` | Target clinic document ID (e.g. `"clinic_dxwk70NNVXdI05ftD9CuHmuZ5212"`) |
| `isActive` | `boolean` | Whether this subdomain route is active |
| `createdAt` | `timestamp` | Provisioning timestamp |

---

### 19. Root Collection: `referrals`
Maps shortened referral codes to their clinic and patient owner.

- **Path**: `/referrals/{referralCode}`
- **Document ID**: 8-character uppercase code (e.g. `REF5A9B8`)

| Field | Type | Description |
|---|---|---|
| `clinicId` | `string` | Clinic where the referral was generated |
| `uid` | `string` | UID of the patient who owns this referral code |

---

### 20. Root Collection: `b2b_referrals`
Tracks B2B clinic referrals, monthly commission payouts, and subscription statuses.

- **Path**: `/b2b_referrals/{referralId}`
- **Document ID**: `ref_{referredClinicId}`

| Field | Type | Description |
|---|---|---|
| `referralId` | `string` | Referral tracking document ID |
| `referrerUid` | `string` | Firebase Auth UID of the clinic admin who shared the referral link |
| `referrerCode` | `string` | Unique referral code string (e.g. `REF-ABC123`) |
| `referredClinicId` | `string` | Document ID of the newly registered clinic tenant |
| `referredClinicName` | `string` | Public display name of the referred clinic |
| `ownerEmail` | `string` | Email address of the referred clinic owner |
| `status` | `string` | Subscription status — `"active"`, `"pending_trial"`, or `"cancelled"` |
| `monthlyFee` | `number` | Monthly subscription fee (€/mo) |
| `commissionPercentage` | `number` | Recurring commission percentage rate (default: `15` for 15%) |
| `monthlyCommission` | `number` | Calculated monthly commission amount (€) |
| `totalEarned` | `number` | Total lifetime commission earned |
| `currentMonthPaid` | `boolean` | Whether current month subscription payout is marked paid |
| `paymentHistory` | `array` of `object` | Monthly payout log entries `{ month, status, amount, paidAt }` |
| `createdAt` | `timestamp` | Document creation timestamp |

---

### 21. Root Collection: `admin` 🆕
Stores authorized Super Admin user identifiers. Used to grant access to the global Super Admin management portal (`/super-admin`).

- **Path**: `/admin/{adminDocId}`
- **Document ID**: Auto-generated or Firebase Auth UID

| Field | Type | Description |
|---|---|---|
| `uid` | `string` | Firebase Authentication User ID of authorized Super Admin |
| `createdAt` | `timestamp` (optional) | Timestamp when admin was authorized |
| `email` | `string` (optional) | Email address snapshot |

---

## ⚡ Firebase Realtime Database Schema

### 1. Node: `loyalty_points`
Live loyalty point balances, partitioned by clinic.

- **Path**: `/loyalty_points/{clinicId}/{userId}`
- **Value type**: `number` (current points balance)

```json
{
  "loyalty_points": {
    "clinic_abc123": {
      "userUid_A": 320,
      "userUid_B": 85
    }
  }
}
```

---

### 2. Node: `activity_events`
Real-time activity log feed shown on the admin dashboard. Max 30 events per clinic (oldest pruned automatically).

- **Path**: `/activity_events/{clinicId}/{eventId}`

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Realtime DB push key |
| `message` | `string` | Human-readable activity description |
| `timestamp` | `number` (epoch ms) | Event time |
| `type` | `string` | Event category — see values below |
| `userName` | `string` | Patient name performing the activity |
| `userUid` | `string` | Patient Firebase Auth UID |

**`type` values**: `"app_opened"`, `"user_signed_in"`, `"item_added_to_cart"`, `"treatment_viewed"`, `"membership_viewed"`, `"rewards_viewed"`, `"qr_checkin"`, `"reward_redeemed"`, `"membership_subscribed"`, `"treatment_purchased"`, `"appointment_booked"`, `"appointment_cancelled"`
