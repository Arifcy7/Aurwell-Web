# Aurwell Backend — Stripe & Membership Integration Guide

Complete technical guide for integrating Stripe payments, membership subscriptions, cart checkouts, and admin panel management with the Aurwell Backend API.

---

## 🌐 Server Base URL

| Environment | Base URL |
|---|---|
| **Production API (Cloud Run)** | `https://api-guexeyftta-uc.a.run.app` |

---

## 📑 Table of Contents

1. [Architecture & Flow Overview](#1-architecture--flow-overview)
2. [Clinic Stripe Setup & Keys Management](#2-clinic-stripe-setup--keys-management)
3. [Membership Subscriptions API](#3-membership-subscriptions-api)
4. [Cart & Treatment Checkout API](#4-cart--treatment-checkout-api)
5. [Refunds & Payment History API](#5-refunds--payment-history-api)
6. [Admin Panel Membership Management API](#6-admin-panel-membership-management-api)
7. [Stripe Webhooks & Real-time Event Handling](#7-stripe-webhooks--real-time-event-handling)
8. [Firestore Schema & Data Models](#8-firestore-schema--data-models)

---

## 1. Architecture & Flow Overview

### Key Architectural Principles:
* **Server-Side Security & Validation**: All treatment prices, discounts, and member-versus-non-member pricing are calculated strictly on the backend via Firestore database records. Client-submitted prices are ignored.
* **Automatic Customer Linking**: Every patient has a Stripe Customer record (`stripeCustomerId`) created or retrieved automatically on their first transaction or subscription.
* **Webhook-Driven Persistence**: Document writes for completed purchases, subscriptions, pause/resume states, and refunds are handled asynchronously on the backend via Stripe Webhooks. The mobile app and admin panel **only read/listen** to Firestore collections.
* **Dual Pricing Model**: Treatments support `nonMemberPrice` and `memberPrice`. If a patient has an active membership (`status: "Active"`), the backend automatically charges `memberPrice`. Otherwise, `nonMemberPrice` is charged.

---

## 2. Clinic Stripe Setup & Keys Management

Clinic owners connect their Stripe Account by providing their Stripe API keys. Keys are stored securely in Google Cloud Secret Manager.

### 2.1 Configure Clinic Stripe Keys
Store Secret Key and Publishable Key for a clinic.

* **Endpoint**: `POST /clinic/setup-stripe`
* **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "clinicId": "clinic_dxwk70NNVXdI05ftD9CuHmuZ5212",
  "publishableKey": "pk_test_51Px...",
  "secretKey": "sk_test_51Px...",
  "webhookSecret": "whsec_..."
}
```

#### Response `200 OK`
```json
{
  "status": "success",
  "message": "Stripe configuration saved successfully.",
  "clinicId": "clinic_dxwk70NNVXdI05ftD9CuHmuZ5212",
  "enabled": true
}
```

---

### 2.2 Get Clinic Config & Public Key
Retrieve clinic details including the public Stripe publishable key for client SDK initialization.

* **Endpoint**: `GET /clinic/{clinic_id}`

#### Response `200 OK`
```json
{
  "clinicId": "clinic_dxwk70NNVXdI05ftD9CuHmuZ5212",
  "name": "Aurwell Aesthetics Clinic",
  "stripe": {
    "enabled": true,
    "publishableKey": "pk_test_51Px...",
    "defaultCurrency": "GBP"
  }
}
```

---

## 3. Membership Subscriptions API

### 3.1 Subscribe Patient to Membership Tier
Initiates a Stripe Subscription with `payment_behavior: default_incomplete`. Returns a `clientSecret` for PaymentSheet authorization.

* **Endpoint**: `POST /memberships/subscribe`
* **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "clinicId": "clinic_dxwk70NNVXdI05ftD9CuHmuZ5212",
  "patientId": "1YBCGYX3W4VR3whe8r7yhd440Uf1",
  "tierId": "cy72nTbSgjFjwZolLDWJ",
  "billingCycle": "monthly",
  "paymentMethodId": "pm_1TydrU0dE9xmQD3LgAVTzUvJ"
}
```

#### Response `200 OK`
```json
{
  "subscriptionId": "sub_1TydXq0dE9xmQD3Lr3gESPor",
  "clientSecret": "pi_3TydLU0dE9xmQD3L0Zx3Aik7_secret_OkYAXZevGZvEoGMUvwAJhzvnm",
  "status": "incomplete",
  "stripeCustomerId": "cus_UxRHOeUJhBxJwW"
}
```

---

### 3.2 List Membership Tiers
Retrieve all active membership plans for a clinic.

* **Endpoint**: `GET /memberships/tiers/{clinic_id}`

#### Response `200 OK`
```json
[
  {
    "tierId": "cy72nTbSgjFjwZolLDWJ",
    "title": "Prestige Elite",
    "description": "Premium monthly skin and aesthetic package",
    "monthlyPrice": 149.00,
    "annualPrice": 1490.00,
    "benefits": [
      "2 Included sessions / month",
      "10% off all additional treatments"
    ],
    "includedTreatments": [
      {
        "treatmentId": "treat_botox_123",
        "sessionsCount": 1
      },
      {
        "treatmentId": "treat_hydra_456",
        "sessionsCount": 1
      }
    ],
    "isActive": true
  }
]
```

---

### 3.3 Create Membership Tier (Admin)
Create a new subscription tier in Firestore and sync product/price to Stripe automatically.

* **Endpoint**: `POST /memberships/tiers`
* **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "clinicId": "clinic_dxwk70NNVXdI05ftD9CuHmuZ5212",
  "title": "Prestige Elite",
  "description": "Monthly comprehensive skincare membership",
  "monthlyPrice": 149.00,
  "annualPrice": 1490.00,
  "benefits": [
    "1 Botox session / month",
    "1 HydraFacial session / month"
  ],
  "includedTreatments": [
    {
      "treatmentId": "treat_botox_123",
      "sessionsCount": 1
    }
  ],
  "imageUrl": "https://storage.googleapis.com/.../banner.jpg",
  "terms": "Cancel anytime after 3 months."
}
```

---

## 4. Cart & Treatment Checkout API

### 4.1 Create Cart PaymentIntent
Creates a Stripe `PaymentIntent` for multi-item cart purchases.

> **Automatic Pricing Logic**:
> - If patient has an active membership (`status: "Active"`), charges **`memberPrice`**.
> - If patient does not have an active membership, charges **`nonMemberPrice`**.

* **Endpoint**: `POST /checkout/create-intent`
* **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "clinicId": "clinic_dxwk70NNVXdI05ftD9CuHmuZ5212",
  "patientId": "1YBCGYX3W4VR3whe8r7yhd440Uf1",
  "userUid": "1YBCGYX3W4VR3whe8r7yhd440Uf1",
  "items": [
    {
      "treatmentId": "treat_botox_123",
      "variantTitle": "Full Face",
      "quantity": 1
    },
    {
      "treatmentId": "treat_hydra_456",
      "variantTitle": "Signature",
      "quantity": 1
    }
  ],
  "availedRewardId": "reward_doc_id_optional",
  "taxAmount": 0.00
}
```

#### Response `200 OK`
```json
{
  "paymentIntentId": "pi_3TydrC0dE9xmQD3L0jMWVoG7",
  "clientSecret": "pi_3TydrC0dE9xmQD3L0jMWVoG7_secret_...",
  "currency": "GBP",
  "subtotal": 345.00,
  "discountAmount": 0.00,
  "taxAmount": 0.00,
  "finalAmount": 345.00,
  "status": "requires_payment_method"
}
```

---

## 5. Refunds & Payment History API

### 5.1 Issue Full or Partial Refund (Admin)
Issue a refund for a transaction. Automatically updates the Firestore transaction `status` to `"Refunded"`.

* **Endpoint**: `POST /payments/refund`
* **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "clinicId": "clinic_dxwk70NNVXdI05ftD9CuHmuZ5212",
  "paymentIntentId": "pi_3TydrC0dE9xmQD3L0jMWVoG7",
  "amount": 240.00,
  "reason": "requested_by_customer"
}
```

#### Response `200 OK`
```json
{
  "refundId": "re_3TydrC0dE9xmQD3L0r6hSwjI",
  "status": "succeeded",
  "amount": 24000,
  "currency": "GBP"
}
```

---

### 5.2 Get Patient Transaction History
Retrieve all past purchases for a patient.

* **Endpoint**: `GET /payments/history/{clinic_id}/{user_uid}`

#### Response `200 OK`
```json
[
  {
    "transactionId": "tx_1785353358755_rxTnp2",
    "clientName": "Siraj Choudhary",
    "email": "sirajchoudhary356@gmail.com",
    "userUid": "1YBCGYX3W4VR3whe8r7yhd440Uf1",
    "paymentIntentId": "pi_3TydrC0dE9xmQD3L0jMWVoG7",
    "treatmentName": "Botox, HydraFacial",
    "type": "treatment",
    "amount": 240.00,
    "status": "Completed",
    "date": 1785353358755,
    "items": [
      {
        "id": "treat_botox_123",
        "title": "Botox",
        "typeTitle": "Full Face",
        "price": 140.00,
        "quantity": 1,
        "status": "not started"
      }
    ]
  }
]
```

---

## 6. Admin Panel Membership Management API

### 6.1 Get Active Membership Details for Patient
Retrieve active subscription status and month-by-month tracking record (`monthlyRecords`).

* **Endpoint**: `GET /memberships/active/{clinic_id}/{user_uid}`

#### Response `200 OK`
```json
{
  "memberId": "sub_1TydXq0dE9xmQD3Lr3gESPor",
  "subscriptionId": "sub_1TydXq0dE9xmQD3Lr3gESPor",
  "userUid": "1YBCGYX3W4VR3whe8r7yhd440Uf1",
  "clientName": "Siraj Choudhary",
  "email": "sirajchoudhary356@gmail.com",
  "membershipId": "cy72nTbSgjFjwZolLDWJ",
  "membershipName": "Prestige Elite",
  "price": 149.00,
  "status": "Active",
  "startDate": 1785354826783,
  "nextBilling": 1788032426783,
  "monthlyRecords": [
    {
      "yearMonth": "2026-07",
      "monthName": "July 2026",
      "billingPeriodStart": 1785354826783,
      "billingPeriodEnd": 1788032426783,
      "isPaid": true,
      "paymentStatus": "paid",
      "overallStatus": "ongoing",
      "treatments": [
        {
          "treatmentId": "treat_botox_123",
          "treatmentTitle": "Botox Anti-Wrinkle Injections",
          "sessionsCount": 1,
          "status": "completed"
        },
        {
          "treatmentId": "treat_hydra_456",
          "treatmentTitle": "Signature HydraFacial",
          "sessionsCount": 1,
          "status": "not started"
        }
      ],
      "notes": "Botox session completed on July 29th."
    }
  ]
}
```

---

### 6.2 Update Monthly Record (Admin Panel)
Allows clinic admins to update overall monthly membership status (`overallStatus`), individual treatment progress (`status`), and staff notes (`notes`) for a billing month.

* **Endpoint**: `PUT /memberships/active/{clinic_id}/{subscription_id}/month/{year_month}`
* **Headers**: `Content-Type: application/json`
* **Path Parameters**:
  - `clinic_id`: Clinic document ID
  - `subscription_id`: Active membership document ID (`sub_...`)
  - `year_month`: Target year-month formatted string (e.g. `2026-07`)

#### Request Body
```json
{
  "overallStatus": "ongoing",
  "treatments": [
    {
      "treatmentId": "treat_botox_123",
      "status": "completed"
    },
    {
      "treatmentId": "treat_hydra_456",
      "status": "ongoing"
    }
  ],
  "notes": "Patient scheduled HydraFacial for next Tuesday."
}
```

#### Response `200 OK`
```json
{
  "status": "success",
  "message": "Monthly record updated successfully for '2026-07'.",
  "subscriptionId": "sub_1TydXq0dE9xmQD3Lr3gESPor",
  "yearMonth": "2026-07"
}
```

---

## 7. Stripe Webhooks & Real-time Event Handling

### Webhook URL Endpoint
Enter this URL in your **Stripe Dashboard -> Developers -> Webhooks**:

```text
https://api-guexeyftta-uc.a.run.app/webhooks/stripe/clinic_dxwk70NNVXdI05ftD9CuHmuZ5212
```

### Events Checklist to Select in Stripe Dashboard

| Event Category | Required Event | Firestore Action Performed |
|---|---|---|
| **Subscription** | `customer.subscription.created` | Initializes `/active_memberships/{subId}` document with patient and tier metadata. |
| **Subscription** | `customer.subscription.updated` | Updates status (`"Active"`, `"Paused"`, `"Cancelled"`) and `nextBilling`. |
| **Subscription** | `customer.subscription.paused` | Sets active membership status to **`"Paused"`**. |
| **Subscription** | `customer.subscription.resumed` | Sets active membership status to **`"Active"`**. |
| **Subscription** | `customer.subscription.deleted` | Sets active membership status to **`"Cancelled"`**. |
| **Invoice** | `invoice.paid` | Confirms payment, initializes `monthlyRecords` for Month 1, sets status to `"Active"`. |
| **Invoice** | `invoice.payment_succeeded` | Confirms recurring monthly payment and appends/updates new `monthlyRecords` entry. |
| **Invoice** | `invoice.payment_failed` | Sets active membership status to **`"Failed"`**. |
| **PaymentIntent**| `payment_intent.succeeded` | Records completed cart purchase in `/transactions/{txId}`, awards loyalty points, emits activity event. |
| **Charge / Refund**| `charge.refunded` | Updates transaction status in `/transactions/{txId}` to **`"Refunded"`**. |
| **Charge / Refund**| `charge.refund.updated` | Updates transaction status to **`"Refunded"`**. |
| **Charge / Refund**| `refund.created` | Updates transaction status to **`"Refunded"`**. |
| **Charge / Refund**| `refund.updated` | Updates transaction status to **`"Refunded"`**. |

---

## 8. Firestore Schema & Data Models

### 8.1 Treatments Collection
`Path: /clinics/{clinicId}/treatments/{treatmentId}`

```json
{
  "title": "Botox Anti-Wrinkle Injections",
  "categories": ["Face", "Wrinkles"],
  "description": "Smoothing treatment for forehead lines and crow's feet.",
  "bannerUrl": "https://storage.googleapis.com/.../botox.jpg",
  "isActive": true,
  "types": [
    {
      "title": "Full Face",
      "nonMemberPrice": 295.00,
      "memberPrice": 240.00
    },
    {
      "title": "Upper Face",
      "nonMemberPrice": 195.00,
      "memberPrice": 160.00
    }
  ]
}
```

---

### 8.2 Active Memberships Subcollection
`Path: /clinics/{clinicId}/active_memberships/{subscriptionId}`

```json
{
  "subscriptionId": "sub_1TydXq0dE9xmQD3Lr3gESPor",
  "stripeSubscriptionId": "sub_1TydXq0dE9xmQD3Lr3gESPor",
  "userUid": "1YBCGYX3W4VR3whe8r7yhd440Uf1",
  "clientName": "Siraj Choudhary",
  "email": "sirajchoudhary356@gmail.com",
  "membershipId": "cy72nTbSgjFjwZolLDWJ",
  "membershipName": "Prestige Elite",
  "price": 149.00,
  "status": "Active",
  "startDate": 1785354826783,
  "nextBilling": 1788032426783,
  "createdAt": 1785354826783,
  "monthlyRecords": [
    {
      "yearMonth": "2026-07",
      "monthName": "July 2026",
      "billingPeriodStart": 1785354826783,
      "billingPeriodEnd": 1788032426783,
      "isPaid": true,
      "paymentStatus": "paid",
      "overallStatus": "not started",
      "treatments": [
        {
          "treatmentId": "treat_botox_123",
          "treatmentTitle": "Botox Anti-Wrinkle Injections",
          "sessionsCount": 1,
          "status": "not started"
        }
      ],
      "notes": ""
    }
  ]
}
```

---

### 8.3 Transactions Subcollection
`Path: /clinics/{clinicId}/transactions/{transactionId}`

```json
{
  "clientName": "Siraj Choudhary",
  "email": "sirajchoudhary356@gmail.com",
  "userUid": "1YBCGYX3W4VR3whe8r7yhd440Uf1",
  "paymentIntentId": "pi_3TydrC0dE9xmQD3L0jMWVoG7",
  "treatmentName": "Botox, Signature HydraFacial",
  "type": "treatment",
  "amount": 240.00,
  "subtotal": 240.00,
  "discountAmount": 0.00,
  "status": "Completed",
  "date": 1785354826783,
  "items": [
    {
      "id": "treat_botox_123",
      "title": "Botox Anti-Wrinkle Injections",
      "typeTitle": "Full Face",
      "price": 140.00,
      "quantity": 1,
      "status": "not started"
    },
    {
      "id": "treat_hydra_456",
      "title": "Signature HydraFacial",
      "typeTitle": "Signature",
      "price": 100.00,
      "quantity": 1,
      "status": "not started"
    }
  ]
}
```
