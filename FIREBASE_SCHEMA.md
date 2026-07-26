# 🗄️ Aurwell Firebase Database Schema

This document is the single source of truth for all Firestore and Realtime Database structures used across the Aurwell platform. It reflects the exact fields read and written by the admin panel and mobile app.

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
         ├── /patients
         │     └── {patientId}
         │           └── /availed_rewards
         │                 └── {availedRewardId}
         ├── /transactions
         │     └── {transactionId}
         └── /active_memberships
               └── {memberId}

/referrals (root collection)
    └── {referralCode}
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
Base branding, settings, and profile for each clinic tenant.

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
Clinic service products with pricing variants.

- **Path**: `/clinics/{clinicId}/treatments/{treatmentId}`
- **Document ID**: Firestore auto-generated

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Treatment name (e.g. `"Botox Anti-Wrinkle Injections"`) |
| `categories` | `array` of `string` | List of assigned category tag titles (e.g. `["Face", "Wrinkles", "Frown lines"]`) |
| `description` | `string` | Full treatment description shown in the mobile app |
| `bannerUrl` | `string` | Treatment banner image URL |
| `featuresHeading` | `string` | Section heading for the features list (e.g. `"Key Benefits"`) |
| `features` | `array` of `string` | Feature / benefit bullet points (entered comma-separated in the form; stored as an array) |
| `types` | `array` of `object` | Pricing variants — see schema below |
| `isActive` | `boolean` | Whether this treatment is visible in the patient app |
| `createdAt` | `timestamp` | Document creation timestamp |

#### `types` item schema:
```json
{
  "title": "string  (e.g. Full Face)",
  "nonMemberPrice": "number  (e.g. 295)",
  "memberPrice": "number | null  (e.g. 240, or null if not set)"
}
```

> **Legacy field fallbacks** (handled in admin code for backwards compatibility):
> - `types[].originalPrice` → mapped to `nonMemberPrice`
> - `types[].discountedPrice` → mapped to `memberPrice`
> - `categoryId` (single string) → mapped to `categories` array

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
| `benefits` | `array` of `string` | Member perk bullet points (entered one-per-line in the form; stored as an array) |
| `includedTreatments` | `array` of `object` | Bundled treatment sessions — see schema below |
| `imageUrl` | `string` | Tier cover / card banner image URL |
| `terms` | `string` | Membership terms and conditions text |
| `isActive` | `boolean` | Whether the tier is visible and purchasable in the patient app |
| `createdAt` | `timestamp` | Document creation timestamp |

#### `includedTreatments` item schema:
```json
{
  "treatmentId": "string  (Firestore document ID from /treatments)",
  "sessionsCount": "number  (e.g. 2)"
}
```

---

### 6. Subcollection: `rewards`
Point-redemption discount coupons.

- **Path**: `/clinics/{clinicId}/rewards/{rewardId}`
- **Document ID**: Firestore auto-generated

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Reward name (e.g. `"HydraFacial Loyalty Reward"`) |
| `description` | `string` | Explanation of the reward and how to use it |
| `cardInfo` | `string` | Short badge text shown on the loyalty card (e.g. `"10% OFF"`, `"FREE"`) |
| `pointsRequired` | `number` | Points needed to unlock this reward |
| `treatmentId` | `string` | Target treatment document ID the discount applies to |
| `discountPercentage` | `number` | Discount percentage applied at checkout (e.g. `10` for 10%) |
| `discountUpTo` | `number \| null` | Maximum currency cap for the discount (optional) |
| `expiryDays` | `number \| null` | Days the availed coupon remains valid after redemption (optional) |
| `isActive` | `boolean` | Whether this reward is visible and redeemable in the patient app |
| `createdAt` | `timestamp` | Document creation timestamp |

---

### 7. Subcollection: `settings` — Rewards Ratio Document
A single fixed-ID document storing the clinic's loyalty point earning rules.

- **Path**: `/clinics/{clinicId}/settings/rewards_ratio`
- **Document ID**: `rewards_ratio` (fixed — not auto-generated)

| Field | Type | Description |
|---|---|---|
| `spendAmount` | `number` | Base currency spend threshold to trigger point earning (e.g. `10` = every £10 spent) |
| `pointsEarned` | `number` | Points awarded per `spendAmount` threshold (e.g. `1` = 1 point per £10) |
| `firstVisitPoints` | `number` | Bonus points awarded on the patient's first check-in visit |
| `googleReviewPoints` | `number` | Bonus points awarded when a patient submits a Google Review |
| `referralPoints` | `number` | Bonus points awarded when a patient successfully refers a friend |

> **Note**: This document is created/updated via `setDoc` (not `addDoc`) to enforce the fixed document ID. It is auto-saved whenever the admin changes the sliders on the Rewards page.

---

### 8. Subcollection: `blogs`
Educational and promotional articles shown in the patient app.

- **Path**: `/clinics/{clinicId}/blogs/{blogId}`
- **Document ID**: Firestore auto-generated
- **Ordering**: Queried `orderBy("createdAt", "desc")`

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Article title |
| `description` | `string` | Short summary / teaser shown on the blog card |
| `imageUrl` | `string` | Banner image URL |
| `articleUrl` | `string` | Full article URL (external website link) |
| `isActive` | `boolean` | Whether the article is visible in the patient app |
| `createdAt` | `timestamp` | Document creation timestamp |

> **Note**: Blogs support both `isActive` toggling and hard deletion (`deleteDoc`) from the admin panel.

---

### 9. Subcollection: `banners`
Promotional carousel banners displayed in the patient mobile app.

- **Path**: `/clinics/{clinicId}/banners/{bannerId}`
- **Document ID**: Firestore auto-generated
- **Ordering**: Queried `orderBy("createdAt", "desc")`

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Banner headline / announcement text |
| `imageUrl` | `string` | Banner image URL (high resolution recommended) |
| `targetType` | `string` | Click action type: `"treatment"` (opens a treatment detail) or `"link"` (opens external URL) |
| `targetId` | `string` | Treatment document ID when `targetType` is `"treatment"`, or a full URL when `targetType` is `"link"` |
| `isActive` | `boolean` | Whether the banner is live and displayed in the app |
| `createdAt` | `timestamp` | Document creation timestamp |

> **Note**: The admin panel only exposes two `targetType` values: `"treatment"` and `"link"`. The mobile app may handle additional deep-link types (`"SHOP_TREATMENTS"`, `"SHOP_MEMBERSHIPS"`, `"TREATMENT_DETAIL"`, `"MEMBERSHIP_DETAIL"`, `"REWARDS_PAGE"`, `"SCAN_PAGE"`, `"URL"`) if set directly in Firestore or via the seed script, but the admin UI maps these to `"treatment"` / `"link"`.

> Banners support both `isActive` toggling and hard deletion (`deleteDoc`) from the admin panel.

---

### 10. Subcollection: `patients`
Registered client profiles for the clinic.

- **Path**: `/clinics/{clinicId}/patients/{patientId}`
- **Document ID**: Firestore auto-generated

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Patient full name |
| `email` | `string` | Registered contact email |
| `phone` | `string` | Phone number (with dial code) |
| `joinedAt` | `timestamp` or `string` | Registration / join date |
| `visitsCount` | `number` | Total check-in visit count |
| `loyaltyBalance` | `number` | **Deprecated** — loyalty points migrated to Firebase Realtime Database at `/loyalty_points/{clinicId}/{userId}` |
| `referralCode` | `string` | Unique referral code (format: `REF-{clinicId}-{uid}`) |
| `referredBy` | `string` (optional) | UID of the patient who referred this user |
| `hasGivenGoogleReview` | `boolean` (optional) | Whether this patient has claimed the Google Review reward |

---

### 11. Sub-subcollection: `availed_rewards`
Coupons a patient has unlocked (redeemed points for) but not yet used at checkout.

- **Path**: `/clinics/{clinicId}/patients/{patientId}/availed_rewards/{availedRewardId}`
- **Document ID**: Firestore auto-generated

| Field | Type | Description |
|---|---|---|
| `rewardId` | `string` | Source reward document ID |
| `title` | `string` | Reward title (copied at avail time) |
| `description` | `string` | Reward description (copied at avail time) |
| `cardInfo` | `string` | Badge text (e.g. `"10% OFF"`) |
| `discountPercentage` | `number` | Discount percentage |
| `treatmentId` | `string` | Treatment the discount applies to |
| `availedDate` | `number` (epoch ms) | Timestamp when the patient redeemed their points for this coupon |
| `expiryDate` | `number` (epoch ms) | Expiration timestamp of the availed coupon |
| `isUsed` | `boolean` | Whether this coupon has been applied to a checkout purchase |

---

### 12. Subcollection: `transactions`
Payment transaction history.

- **Path**: `/clinics/{clinicId}/transactions/{transactionId}`
- **Document ID format**: `tx_{epochMs}_{uidSuffix}`

| Field | Type | Description |
|---|---|---|
| `clientName` | `string` | Payer patient name |
| `email` | `string` | Payer patient email |
| `userUid` | `string` | Firebase Auth UID of the patient |
| `treatmentName` | `string` | Summary title of the purchased item(s) |
| `items` | `array` of `object` | Line-item breakdown — see schema below |
| `amount` | `number` | Final charged amount |
| `subtotal` | `number` (optional) | Amount before discounts |
| `discountAmount` | `number` (optional) | Total discount applied |
| `appliedRewardId` | `string` (optional) | ID of the availed reward coupon used at checkout |
| `type` | `string` | Transaction category: `"treatment"` or `"membership"` |
| `date` | `number` (epoch ms) or `timestamp` | Checkout timestamp |
| `status` | `string` | Invoice status: `"Completed"`, `"Pending"`, or `"Refunded"` |

#### `items` item schema:
```json
{
  "id": "string  (treatment or membership document ID)",
  "title": "string  (display title)",
  "price": "number  (unit price)",
  "typeTitle": "string  (selected variant e.g. Full Face)",
  "isMembership": "boolean"
}
```

---

### 13. Subcollection: `active_memberships`
Active patient subscription records.

- **Path**: `/clinics/{clinicId}/active_memberships/{memberId}`
- **Document ID format**: `sub_{epochMs}_{uidSuffix}`

| Field | Type | Description |
|---|---|---|
| `clientName` | `string` | Subscriber patient name |
| `email` | `string` | Subscriber email |
| `userUid` | `string` | Firebase Auth UID |
| `membershipId` | `string` | Target membership tier document ID |
| `membershipName` | `string` | Subscribed tier name |
| `price` | `number` | Recurring price at time of subscription |
| `startDate` | `number` (epoch ms) or `timestamp` | Subscription start |
| `nextBilling` | `number` (epoch ms) or `timestamp` | Next renewal date |
| `status` | `string` | `"Active"`, `"Failed"`, or `"Cancelled"` |
| `createdAt` | `number` (epoch ms) or `timestamp` | Record creation timestamp |

---

### 14. Root Collection: `referrals`
Maps shortened referral codes to their clinic and patient owner.

- **Path**: `/referrals/{referralCode}`
- **Document ID**: 8-character uppercase code (e.g. `REF5A9B8`)

| Field | Type | Description |
|---|---|---|
| `clinicId` | `string` | Clinic where the referral was generated |
| `uid` | `string` | UID of the patient who owns this referral code |

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

**`type` values**: `"app_opened"`, `"user_signed_in"`, `"item_added_to_cart"`, `"treatment_viewed"`, `"membership_viewed"`, `"rewards_viewed"`, `"qr_checkin"`, `"reward_redeemed"`, `"membership_subscribed"`, `"treatment_purchased"`

```json
{
  "activity_events": {
    "clinic_abc123": {
      "-Nxyz123456": {
        "id": "-Nxyz123456",
        "message": "Sophia Hartley completed QR Verification check-in",
        "timestamp": 1721669800000,
        "type": "qr_checkin",
        "userName": "Sophia Hartley",
        "userUid": "CqJSmHls3qPFHx48ncEVo1Kc9GB3"
      }
    }
  }
}
```
