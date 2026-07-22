# 🗄️ Aurwell Firebase Database Schema

This document details the complete Firestore database schema, paths, data types, and collection hierarchies implemented across the Aurwell platform.

---

## 🗺️ Collection Hierarchy

```
/users (root collection)
    └── {uid} (user document)

/clinics (root collection)
    └── {clinicId} (clinic config document)
         ├── /categories
         │     └── {categoryId}
         ├── /treatments
         │     └── {treatmentId}
         ├── /memberships
         │     └── {membershipId}
         ├── /rewards
         │     └── {rewardId}
         ├── /settings
         │     └── rewards_ratio (fixed document ID)
         ├── /blogs
         │     └── {blogId}
         ├── /banners
         │     └── {bannerId}
         ├── /patients
         │     └── {patientId}
         ├── /transactions
         │     └── {transactionId}
         └── /active_memberships
               └── {memberId}
```

---

## 📑 Detailed Collection Specifications

### 1. Root Collection: `users`
Stores user profile mapping and security role metadata.

- **Path**: `/users/{uid}`
- **Document ID**: `uid` (matching Firebase Authentication User ID)

| Field | Type | Description |
|---|---|---|
| `uid` | `string` | Unique Authentication Identifier |
| `firstName` | `string` | User's first name |
| `lastName` | `string` | User's last name |
| `email` | `string` | Primary email address |
| `role` | `string` | System RBAC role (e.g. `"clinic_admin"`) |
| `clinicId` | `string` | Associated Tenant Document ID (maps to `/clinics/{clinicId}`) |
| `createdAt` | `timestamp` | Account creation timestamp |

---

### 2. Root Collection: `clinics`
Houses base branding, settings, and profile details for individual clinics.

- **Path**: `/clinics/{clinicId}`
- **Document ID**: `clinicId` (format: `clinic_{ownerUid}`)

| Field | Type | Description |
|---|---|---|
| `clinicId` | `string` | Tenant Identifier |
| `merchantName` | `string` | Public display name of the clinic |
| `brandColor` | `string` | Hex value for white-label app customization |
| `websiteUrl` | `string` | Optional external clinic site |
| `treatmentList` | `array` of `string` | List of treatments tags |
| `description` | `string` | Public clinic bio / details |
| `currency` | `string` | Standard base currency (e.g., `"EUR"`, `"USD"`, `"RON"`, `"SEK"`, `"INR"`) |
| `timezone` | `string` | Local operations timezone (e.g. `"Europe/Stockholm"`) |
| `country` | `string` | Two-character ISO country code (e.g. `"RO"`) |
| `address` | `string` | Physical location street address |
| `postalCode` | `string` | Local address zip/postal code |
| `phone` | `string` | Formatted contact number containing dial code |
| `googleMapUrl` | `string` | Optional Google Map URL of the address |
| `latitude` | `number` | Auto-extracted physical latitude of the clinic map address |
| `longitude` | `number` | Auto-extracted physical longitude of the clinic map address |
| `appHeroImageUrl` | `string` | Custom mobile app home screen hero image link |
| `blogSectionTitle` | `string` | Customized title label for the blogs section/tab (default `"Blogs"`) |
| `createdAt` | `timestamp` | Provisioning timestamp |
| `ownerUid` | `string` | Owner profile UID |

---

### 3. System Constants: Treatment Categories
Treatment categories are fixed system-wide tags (not editable per clinic). A single treatment document can belong to **multiple categories** simultaneously.

**Predefined Standard Categories**:
`Acne`, `Arm flaps`, `Arm pits`, `Arms`, `Back`, `Belly`, `Bikini area`, `Bunny lines`, `Buttocks`, `Cheeks`, `Cheekbones`, `Chest`, `Chin`, `Chin cleft`, `Collagen`, `Crow's feet`, `Double chin`, `Elasticity`, `Eyebrows`, `Eyes`, `Face`, `Feet`, `Fine lines`, `Frown lines`, `Hair`, `Hands`, `Hydration`, `Hyperpigmentation`, `Inner thighs`, `Jawline`, `Jowls`, `Legs`, `Lip flip`, `Lip lines`, `Lips`, `Low energy`, `Love handles`, `Marionette lines`, `Mood`, `Nails`, `Neck`, `Neck bands`, `Nose`, `Outer thighs`, `Pore shrinking`, `Redness`, `Rosecea`, `Scarring`, `Skin-tightening`, `Smile lines`, `Smoothness`, `Sun damage`, `Teeth`, `Temples`, `Texture`, `Upper legs`, `Veins`, `Wrinkles`.

---

### 4. Subcollection: `treatments`
Stores services, description details, dynamic advantages, multi-category tags, and pricing variants.

- **Path**: `/clinics/{clinicId}/treatments/{treatmentId}`
- **Document ID**: Firestore Auto-Generated

| Field | Type | Description |
|---|---|---|
| `categories` | `array` of `string` | List of assigned category tag titles (e.g. `["Face", "Fine lines", "Wrinkles"]`) |
| `title` | `string` | Treatment item name (e.g. `"Botox Cosmetic"`) |
| `description` | `string` | Comprehensive details of the service |
| `bannerUrl` | `string` | Public image illustration link |
| `featuresHeading`| `string` | Header string for features list (e.g. `"Key Benefits"`) |
| `features` | `array` of `string` | Bulleted list of characteristics |
| `types` | `array` of `object` | Pricing tier configurations (structure below) |
| `isActive` | `boolean` | Visible/Available state in patient app |
| `createdAt` | `timestamp` | Creation timestamp |

#### `types` Object Schema:
```json
{
  "title": "string (e.g. Full Face)",
  "nonMemberPrice": "number (e.g. 250)",
  "memberPrice": "number (e.g. 199)"
}
```

---

### 5. Subcollection: `memberships`
Houses bundle plans incorporating multiple treatment services.

- **Path**: `/clinics/{clinicId}/memberships/{membershipId}`
- **Document ID**: Firestore Auto-Generated

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Membership tier title (e.g. `"Platinum VIP"`) |
| `description` | `string` | Summary details of package benefits |
| `price` | `number` | Monthly subscription cost |
| `bannerUrl` | `string` | Subscription card banner image URL |
| `terms` | `string` | Terms and conditions policy |
| `bundledTreatments` | `array` of `string` | List of bundled treatment IDs |
| `isActive` | `boolean` | Subscription visibility toggle |
| `createdAt` | `timestamp` | Creation timestamp |

---

### 6. Subcollection: `rewards`
Point-redemption coupons.

- **Path**: `/clinics/{clinicId}/rewards/{rewardId}`
- **Document ID**: Firestore Auto-Generated

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Reward voucher name |
| `description` | `string` | Description of points exchange rules |
| `cardInfo` | `string` | Text badge shown on the loyalty card (e.g., `"10% OFF"`) |
| `pointsRequired` | `number` | Required points to unlock the reward |
| `treatmentId` | `string` | Target treatment document ID |
| `discountPercentage` | `number` | Amount off (%) applied to the treatment price |
| `discountUpTo` | `number` (optional) | Maximum allowed discount cap threshold |
| `expiryDays` | `number` (optional) | Number of days the redeemed reward remains valid |
| `isActive` | `boolean` | Active status toggle switch |
| `createdAt` | `timestamp` | Creation timestamp |

---

### 7. Subcollection: `settings` (Ratio Document)
Houses single documents containing fixed-ID clinic metadata.

- **Path**: `/clinics/{clinicId}/settings/rewards_ratio`
- **Document ID**: `rewards_ratio`

| Field | Type | Description |
|---|---|---|
| `spendAmount` | `number` | Threshold currency spend amount |
| `pointsEarned` | `number` | Point rewards earned per spend amount |
| `firstVisitPoints` | `number` | Point rewards earned on very first check-in visit |
| `googleReviewPoints` | `number` | Point rewards earned for leaving a Google Review |
| `referralPoints` | `number` | Point rewards earned for referring a friend |

---

### 8. Subcollection: `patients`
Registered client files for the clinic.

- **Path**: `/clinics/{clinicId}/patients/{patientId}`
- **Document ID**: Firestore Auto-Generated

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Full name |
| `email` | `string` | Registered contact email |
| `phone` | `string` | Phone details |
| `joinedAt` | `timestamp` | Join date timestamp |
| `visitsCount` | `number` | Visited session counter |
| `loyaltyBalance` | `number` | [DEPRECATED] Migrated to Firebase Realtime Database at `/loyalty_points/{patientId}` |
| `referralCode` | `string` | Unique referral identifier (format: `REF-{clinicId}-{uid}`) |
| `referredBy` | `string` (optional) | UID of the user who referred this patient |
| `hasGivenGoogleReview` | `boolean` (optional) | Flag indicating if this patient has submitted a Google review for rewards points |

---

### 9. Subcollection: `transactions`
Payment transaction invoices history.

- **Path**: `/clinics/{clinicId}/transactions/{transactionId}`
- **Document ID**: Firestore Auto-Generated (format: `tx_{epochMs}_{uidSuffix}`)

| Field | Type | Description |
|---|---|---|
| `clientName` | `string` | Payer patient name |
| `email` | `string` | Payer patient email address |
| `userUid` | `string` | Associated Firebase Authentication User ID |
| `treatmentName` | `string` | Summary title of items or subscribed membership |
| `items` | `array` of `object` | Line-item breakdown (structure below) |
| `amount` | `number` | Final charged price amount |
| `subtotal` | `number` (optional) | Order price before discounts |
| `discountAmount` | `number` (optional) | Total coupon discount applied |
| `appliedRewardId` | `string` (optional) | Target availed reward document ID used in checkout |
| `type` | `string` | Transaction category (`"treatment"` or `"membership"`) |
| `date` | `number` / `timestamp` | Checkout timestamp (epoch ms) |
| `status` | `string` | Invoice status (`"Completed"`, `"Pending"`, `"Refunded"`) |

#### `items` Object Schema:
```json
{
  "id": "string (Treatment or Membership ID)",
  "title": "string (Item display title)",
  "price": "number (Item unit price)",
  "typeTitle": "string (Selected variant title e.g. Full Face)",
  "isMembership": "boolean (Flag indicating if item is a membership)"
}
```

---

### 10. Subcollection: `active_memberships`
Active patient subscription trackers.

- **Path**: `/clinics/{clinicId}/active_memberships/{memberId}`
- **Document ID**: Firestore Auto-Generated (format: `sub_{epochMs}_{uidSuffix}`)

| Field | Type | Description |
|---|---|---|
| `clientName` | `string` | Patient subscriber name |
| `email` | `string` | Patient email address |
| `userUid` | `string` | Associated Firebase Authentication User ID |
| `membershipId` | `string` | Target membership plan document ID |
| `membershipName` | `string` | Subscribed membership bundle title |
| `price` | `number` | Recurring monthly subscription price rate |
| `startDate` | `number` / `timestamp` | Subscription start timestamp (epoch ms) |
| `nextBilling` | `number` / `timestamp` | Next renewal billing timestamp (epoch ms) |
| `status` | `string` | Active state (`"Active"`, `"Failed"`, `"Cancelled"`) |
| `createdAt` | `number` / `timestamp` | Subscription record creation timestamp (epoch ms) |

---

### 11. Subcollection: `blogs`
Informational and promotional blog articles for patient education.

- **Path**: `/clinics/{clinicId}/blogs/{blogId}`
- **Document ID**: Firestore Auto-Generated

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Article title |
| `description` | `string` | Brief summary of the article |
| `imageUrl` | `string` | Banner image URL |
| `articleUrl` | `string` | URL to the full article on the clinic's website |
| `isActive` | `boolean` | Visible/Active switch toggle |
| `createdAt` | `timestamp` | Creation timestamp |

---

## ⚡ Firebase Realtime Database Schema

In addition to Firestore, Aurwell uses Firebase Realtime Database for high-performance and low-latency synchronization of key metrics (such as client loyalty balances).

### 1. Root Node: `loyalty_points`
Stores the active balance of loyalty points for each registered patient partitioned by clinic ID.

- **Path**: `/loyalty_points/{clinicId}/{userId}`
- **Data Format**: Clinic ID containing key-value pair of string (User ID) mapped to number (Loyalty Points balance)

```json
{
  "loyalty_points": {
    "clinic_abc123": {
      "CqJSmHls3qPFHx48ncEVo1Kc9GB3": 50,
      "patient_another_uid": 120
    }
  }
}
```

---

### 2. Root Node: `activity_events`
Stores real-time activity event logs (check-ins, reward redemptions, membership subscriptions, treatment purchases) partitioned per clinic.

- **Path**: `/activity_events/{clinicId}/{eventId}`
- **Retention Policy**: Per clinic, a maximum of 30 most recent events are maintained. When a new event exceeds the 30-item limit, the oldest event is automatically pruned from Realtime Database.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique Realtime DB push key (e.g. `evt_1721669800000`) |
| `message` | `string` | Detailed activity description (e.g., `"Sarah Jenkins opened the app"`, `"Sarah Jenkins signed in"`, `"Sarah Jenkins added Hydrafacial to cart"`, `"Sarah Jenkins viewed treatment Hydrafacial"`, `"Sarah Jenkins viewed membership VIP Gold Tier"`, `"Sarah Jenkins opened Rewards & Loyalty Points"`, `"Sarah Jenkins completed QR Verification check-in"`, `"Markus Thorne redeemed 500 Loyalty Points for Hydrafacial"`, `"Elena Vance renewed Gold VIP Membership Tier"`, `"Sarah Jenkins purchased Hydrafacial"`) |
| `timestamp` | `number` | Event timestamp (epoch ms) |
| `type` | `string` | Event category (`"app_opened"`, `"user_signed_in"`, `"item_added_to_cart"`, `"treatment_viewed"`, `"membership_viewed"`, `"rewards_viewed"`, `"qr_checkin"`, `"reward_redeemed"`, `"membership_subscribed"`, `"treatment_purchased"`) |
| `userName` | `string` | Name of the patient performing the activity |
| `userUid` | `string` | Associated Firebase Authentication UID |

```json
{
  "activity_events": {
    "clinic_abc123": {
      "-Nxyz123456": {
        "id": "-Nxyz123456",
        "message": "Sarah Jenkins completed QR Verification check-in",
        "timestamp": 1721669800000,
        "type": "qr_checkin",
        "userName": "Sarah Jenkins",
        "userUid": "CqJSmHls3qPFHx48ncEVo1Kc9GB3"
      }
    }
  }
}
```

---

### 12. Subcollection: `banners`
Announcement banners displayed inside the customer mobile app (Home or Shop screens).

- **Path**: `/clinics/{clinicId}/banners/{bannerId}`
- **Document ID**: Firestore Auto-Generated

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Announcement text of the banner |
| `screen` | `string` | Target display screen (fixed to `"home"`) |
| `isActive` | `boolean` | Status toggle switch for display visibility |
| `buttonText` | `string` | Optional text shown on the call-to-action button (e.g. `"Learn More"`) |
| `targetType` | `string` | Optional navigation destination action: `"SHOP_TREATMENTS"`, `"SHOP_MEMBERSHIPS"`, `"TREATMENT_DETAIL"`, `"MEMBERSHIP_DETAIL"`, `"REWARDS_PAGE"`, `"SCAN_PAGE"`, or `"URL"` |
| `targetId` | `string` | Optional target reference payload (contains treatment ID, membership ID, or URL string corresponding to the `targetType`) |
| `createdAt` | `timestamp` | Creation timestamp |

---

### 13. Subcollection: `availed_rewards`
Stores the coupons that the patient has claimed/unlocked but not yet applied to a cart purchase.

- **Path**: `/clinics/{clinicId}/patients/{patientId}/availed_rewards/{availedRewardId}`
- **Document ID**: Firestore Auto-Generated

| Field | Type | Description |
|---|---|---|
| `rewardId` | `string` | ID of the source reward coupon |
| `title` | `string` | Title of the reward |
| `description` | `string` | Description of the reward |
| `cardInfo` | `string` | Text badge (e.g. `"10% OFF"`) |
| `discountPercentage` | `number` | Discount percentage amount |
| `treatmentId` | `string` | Treatment service the discount applies to |
| `availedDate` | `number` (epoch ms) | Timestamp when reward was unlocked |
| `expiryDate` | `number` (epoch ms) | Expiration timestamp of the availed reward |
| `isUsed` | `boolean` | Flag indicating if this coupon has been used in a checkout purchase |

---

### 14. Root Collection: `referrals`
Stores the mapping of shortened referral codes to their respective clinics and referee patient accounts.

- **Path**: `/referrals/{referralCode}`
- **Document ID**: The 8-character uppercase referral code (e.g. `REF5A9B8`).

| Field | Type | Description |
|---|---|---|
| `clinicId` | `string` | ID of the clinic where the referral was generated |
| `uid` | `string` | UID of the patient who owns this referral code |


