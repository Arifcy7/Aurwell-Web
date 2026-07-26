# 📲 Firebase Cloud Messaging (FCM) Integration Guide for Kotlin Multiplatform (KMP)

This document provides a step-by-step technical guide to integrating and catching Firebase Cloud Messaging (FCM) push notifications on both Android and iOS apps using a **Kotlin Multiplatform (KMP)** project setup with a **Shared UI** (e.g. Compose Multiplatform).

---

## 🏗️ Architecture Overview

The Aurwell Admin Panel broadcasts push notifications by calling the Serverless Next.js API route (`/api/notifications/send`). It targets users based on conditions and retrieves their registered device tokens from Firestore (`/users/{uid}`).

```
   ┌──────────────────────────────────────────────┐
   │             Admin Dashboard panel            │
   └──────────────────────┬───────────────────────┘
                          │ (REST POST call)
                          ▼
   ┌──────────────────────────────────────────────┐
   │        Next.js API (Firebase Admin SDK)      │
   └──────────────────────┬───────────────────────┘
                          │ (Queries tokens / dispatches via FCM)
                          ▼
   ┌──────────────────────────────────────────────┐
   │          Firebase Cloud Messaging            │
   └───────┬──────────────────────────────┬───────┘
           │ (Android push)               │ (APNs/iOS push)
           ▼                              ▼
┌────────────────────┐          ┌────────────────────┐
│   Android App      │          │      iOS App       │
└────────────────────┘          └────────────────────┘
```

---

## 🗄️ Firestore Token Schema

When the patient app initializes on a user's device, it must retrieve the FCM Registration Token and register it under the authenticated user's document in Firestore.

- **Collection Path**: `/users/{uid}`
- **Field Name**: `fcmTokens`
- **Field Type**: `array` of `string`
- **Operation**: Use Firestore `arrayUnion` to append the token to prevent overwriting tokens from other active devices (e.g., if logged in on both iPad and Android phone).

---

## 🤝 1. Shared KMP Setup (Common Code)

To interact with Firestore inside your shared KMP directory (e.g. `shared/src/commonMain`), use a KMP-friendly library like **GitLive Firebase SDK** (`dev.gitlive:firebase-firestore`) or implement platform-specific expect/actual drivers.

### Token Registration Function
Add this function to your KMP repository/service layer to register the token after user logs in:

```kotlin
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.firestore
import dev.gitlive.firebase.firestore.FieldValue

object AurwellNotificationManager {
    
    /**
     * Uploads the FCM token to the user's Firestore document.
     * Call this right after authentication completes or when a new token is generated.
     */
    suspend fun registerDeviceToken(userId: String, token: String) {
        try {
            val userDocRef = Firebase.firestore.document("users/$userId")
            
            // Append token to the fcmTokens array field
            userDocRef.update(
                "fcmTokens" to FieldValue.arrayUnion(token)
            )
            println("FCM token successfully registered in Firestore")
        } catch (e: Exception) {
            println("Failed to upload FCM token: ${e.message}")
        }
    }
}
```

---

## 🤖 2. Android Native Setup

For Android, FCM is integrated into the native module (`composeApp/src/androidMain` or `androidApp`).

### Step A: Configuration
1. Create a project in the Firebase Console and register your Android app (package name e.g. `com.aurwell.app`).
2. Download `google-services.json` and place it in your Android app module directory.
3. In your root `build.gradle.kts`:
   ```kotlin
   plugins {
       id("com.google.gms.google-services") version "4.4.2" apply false
   }
   ```
4. In your app-level `build.gradle.kts` (under Compose App / Android module):
   ```kotlin
   plugins {
       id("com.google.gms.google-services")
   }

   dependencies {
       implementation(platform("com.google.firebase:firebase-bom:33.1.2"))
       implementation("com.google.firebase:firebase-messaging")
   }
   ```

### Step B: Service Implementation
Create a custom service extending `FirebaseMessagingService` to handle background token updates and catch messages in the foreground:

```kotlin
package com.aurwell.app.fcm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.aurwell.app.MainActivity // Your KMP main launcher activity
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch

class AurwellMessagingService : FirebaseMessagingService() {

    private val scope = MainScope()

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Send token to Firestore if user is logged in
        // In KMP, you can dispatch an event or read the current session
        getCurrentUserId()?.let { userId ->
            scope.launch {
                AurwellNotificationManager.registerDeviceToken(userId, token)
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        
        // Extract details
        val title = message.notification?.title ?: message.data["title"] ?: "Aurwell Alert"
        val body = message.notification?.body ?: message.data["body"] ?: ""
        
        // Show System HUD Notification
        sendNotification(title, body)
    }

    private fun sendNotification(title: String, messageBody: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        val channelId = "aurwell_broadcasts"
        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info) // Replace with your app logo
            .setContentTitle(title)
            .setContentText(messageBody)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Clinic News & Broadcasts",
                NotificationManager.IMPORTANCE_HIGH
            )
            notificationManager.createNotificationChannel(channel)
        }

        notificationManager.notify(0, notificationBuilder.build())
    }

    private fun getCurrentUserId(): String? {
        // Implement session helper or call Firebase Auth client to fetch active UID
        return null 
    }
}
```

### Step C: Android Manifest Registration
Add the service inside `<application>` tag in `AndroidManifest.xml`:

```xml
<service
    android:name=".fcm.AurwellMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

---

## 🍎 3. iOS Native Setup

For iOS, FCM requires APNs (Apple Push Notification service) configuration. Integrate this inside your native iOS App project wrapper (`iosApp` workspace/xcodeproj).

### Step A: Apple Developer Portal Setup
1. Log in to the [Apple Developer Account](https://developer.apple.com).
2. Go to **Certificates, Identifiers & Profiles** -> **Keys**.
3. Create an **APNs Key** (p8 file) and note down the **Key ID** and your **Team ID**.
4. Go to **Identifiers**, select your App ID, and enable **Push Notifications** under Capabilities.
5. Upload the APNs Key (`.p8`) to your Firebase Console under **Project Settings** -> **Cloud Messaging** -> **iOS App configuration**.

### Step B: Xcode Project Capabilities
1. Open the `iosApp.xcworkspace` in Xcode.
2. Select your root project, navigate to **Signing & Capabilities**.
3. Click `+ Capability` and add:
   - **Push Notifications**
   - **Background Modes** (check **Remote notifications** inside background options).

### Step C: AppDelegate Swift Configuration
Initialize FCM in your Swift `AppDelegate.swift` file.

```swift
import UIKit
import FirebaseCore
import FirebaseMessaging
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // 1. Initialize Firebase Core
        FirebaseApp.configure()
        
        // 2. Set Up Notification Delegates
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self
        
        // 3. Request APNs Authorizations
        let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
        UNUserNotificationCenter.current().requestAuthorization(options: authOptions) { granted, error in
            if let error = error {
                print("APNs Request Authorization Error: \(error.localizedDescription)")
            }
        }
        
        application.registerForRemoteNotifications()
        
        return true
    }

    // MARK: - APNs Registration Hooks
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Bind native APNs token to Firebase FCM
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Failed to register remote notifications: \(error.localizedDescription)")
    }

    // MARK: - Firebase MessagingDelegate
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("Firebase Registration Token: \(token)")
        
        // Forward token back to KMP / Save to Firestore
        // Post notification locally or call KMP bridging interface directly
        NotificationCenter.default.post(
            name: Notification.Name("AurwellFCMTokenUpdated"),
            object: nil,
            userInfo: ["token": token]
        )
    }

    // MARK: - UNUserNotificationCenterDelegate (Foreground notifications)
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Display native banners/alerts even if app is in active foreground
        completionHandler([[.banner, .list, .sound]])
    }
}
```

### Step D: Catching Token inside SwiftUI / KMP Shared Code
Inside your main KMP UI entry view, you can subscribe to the `AurwellFCMTokenUpdated` Notification Center events to trigger the shared Firestore upload:

```swift
import SwiftUI
import shared // KMP Shared Library wrapper

struct ComposeViewControllerRepresentation: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        let controller = MainViewControllerKt.MainViewController() // Compose UI ViewController
        
        // Set up Notification Observer
        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("AurwellFCMTokenUpdated"),
            object: nil,
            queue: .main
        ) { notification in
            if let fcmToken = notification.userInfo?["token"] as? String {
                // Fetch authenticated user UID and call KMP code
                if let userId = getCurrentUserId() {
                    AurwellNotificationManager.shared.registerDeviceToken(userId: userId, token: fcmToken) { error in
                        if let error = error {
                            print("Error registering token in KMP: \(error)")
                        }
                    }
                }
            }
        }
        
        return controller
    }
    
    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
```

---

## 🖼️ Rich Push Notifications (with Images)

The Aurwell Admin Dashboard sends the image URL in the FCM payload using:
- **Common Payload**: `notification.imageUrl`
- **Android Payload**: `android.notification.imageUrl`
- **iOS APNs Payload**: `fcmOptions.imageUrl` with `mutableContent: true`

### 1. Android Image Catching
No extra code is required! As long as you use Firebase Messaging SDK 20.0.0 or higher, the Android OS automatically downloads the image URL and displays it in the expanded notification view.

### 2. iOS Image Catching (Notification Service Extension)
By default, iOS does not display images in push notifications unless your app includes a **Notification Service Extension** to download the media asset before rendering the notification.

1. **Create Target**: In Xcode, choose **File > New > Target...**, select **Notification Service Extension**, and name it (e.g. `NotificationService`).
2. **Add Dependencies**: Make sure the new Extension target compiles with the Firebase pods/SPM packages.
3. **Configure Code**: Open the generated `NotificationService.swift` file and replace its contents with the following:

```swift
import UserNotifications
import FirebaseMessaging

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
        
        if let bestAttemptContent = bestAttemptContent {
            // Firebase Messaging helper parses fcmOptions.image and downloads/caches it automatically
            Messaging.serviceExtension().populateNotificationContent(bestAttemptContent, withContentHandler: contentHandler)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }
}
```

---

## 🧪 Testing Checklist
1. Deploy Next.js admin panel and login as a clinic administrator.
2. Load the Android/iOS client and log in with a client account. Ensure your device requests notification permissions.
3. Check the client's record in the Firebase Firestore: `/users/{uid}` should contain an array field `fcmTokens` filled with your device's registration string.
4. Compose a test push notification in the dashboard, select "All" or a visit filter matching the client's `visitsCount`, and click **Send Push Broadcast**.
5. Observe the device receive the push notification!
