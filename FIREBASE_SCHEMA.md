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
         ├── /custom_plans
         │     └── {planId}
         ├── /memberships
         │     └── {membershipId}
         ├── /offers
         │     └── {offerId}
         ├── /rewards
         │     └── {rewardId}
         ├── /settings
         │     └── rewards_ratio (fixed document ID)
         ├── /blogs
         │     └── {blogId}
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
| `blogSectionTitle` | `string` | Customized title label for the blogs section/tab (default `"Blogs"`) |
| `createdAt` | `timestamp` | Provisioning timestamp |
| `ownerUid` | `string` | Owner profile UID |

---

### 3. Subcollection: `categories`
Used to group treatments inside the clinic app builder.

- **Path**: `/clinics/{clinicId}/categories/{categoryId}`
- **Document ID**: Firestore Auto-Generated

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Category display title (e.g. `"Dermal Fillers"`) |

---

### 4. Subcollection: `treatments`
Stores services, description details, dynamic advantages, and pricing variants.

- **Path**: `/clinics/{clinicId}/treatments/{treatmentId}`
- **Document ID**: Firestore Auto-Generated

| Field | Type | Description |
|---|---|---|
| `categoryId` | `string` | Target category document ID |
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
  "title": "string (e.g. Forehead Wrinkles)",
  "originalPrice": "number (e.g. 250)",
  "discountedPrice": "number (e.g. 199)"
}
```

---

### 5. Subcollection: `custom_plans`
Stores customized plans for dynamic patient care.

- **Path**: `/clinics/{clinicId}/custom_plans/{planId}`
- **Document ID**: Firestore Auto-Generated

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Custom plan name |
| `description` | `string` | Details of cycle deliverables |
| `price` | `number` | Billing cost value |
| `billingCycle` | `string` | Cost recurrence intervals (`"weekly"`, `"monthly"`, `"yearly"`) |
| `features` | `array` of `string` | Detailed list of target plan parameters |
| `isActive` | `boolean` | Available/Active switch toggle |
| `createdAt` | `timestamp` | Creation timestamp |

---

### 6. Subcollection: `memberships`
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

### 7. Subcollection: `offers`
Vouchers, coupons, and seasonal discounts.

- **Path**: `/clinics/{clinicId}/offers/{offerId}`
- **Document ID**: Firestore Auto-Generated

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Campaign title (e.g. `"Summer Radiance Special"`) |
| `description` | `string` | Promotional details and guidelines |
| `discountValue` | `number` | Numeric discount amount value |
| `discountType` | `string` | Calculation mode (`"percentage"` or `"fixed"`) |
| `validUntil` | `timestamp` | Expire deadline timestamp |
| `isActive` | `boolean` | Active state toggle switch |
| `createdAt` | `timestamp` | Creation timestamp |

---

### 8. Subcollection: `rewards`
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
| `isActive` | `boolean` | Active status toggle switch |
| `createdAt` | `timestamp` | Creation timestamp |

---

### 9. Subcollection: `settings` (Ratio Document)
Houses single documents containing fixed-ID clinic metadata.

- **Path**: `/clinics/{clinicId}/settings/rewards_ratio`
- **Document ID**: `rewards_ratio`

| Field | Type | Description |
|---|---|---|
| `spendAmount` | `number` | Threshold currency spend amount |
| `pointsEarned` | `number` | Point rewards earned per spend amount |

---

### 10. Subcollection: `patients`
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
| `loyaltyBalance` | `number` | Accumulated loyalty points |

---

### 11. Subcollection: `transactions`
Payment transaction invoices history.

- **Path**: `/clinics/{clinicId}/transactions/{transactionId}`
- **Document ID**: Firestore Auto-Generated

| Field | Type | Description |
|---|---|---|
| `clientName` | `string` | Payer patient name |
| `treatmentName` | `string` | Selected service description |
| `amount` | `number` | Billing total price amount |
| `date` | `timestamp` | Checkout timestamp |
| `status` | `string` | Invoice status (`"Completed"`, `"Pending"`, `"Refunded"`) |

---

### 12. Subcollection: `active_memberships`
Active patient subscription trackers.

- **Path**: `/clinics/{clinicId}/active_memberships/{memberId}`
- **Document ID**: Firestore Auto-Generated

| Field | Type | Description |
|---|---|---|
| `clientName` | `string` | Patient subscriber name |
| `email` | `string` | Patient email address |
| `membershipName` | `string` | Subscribed membership bundle title |
| `price` | `number` | Recurring price rate |
| `nextBilling` | `timestamp` | Renewal billing timestamp |
| `status` | `string` | Active state (`"Active"`, `"Failed"`, `"Cancelled"`) |

---

### 13. Subcollection: `blogs`
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
