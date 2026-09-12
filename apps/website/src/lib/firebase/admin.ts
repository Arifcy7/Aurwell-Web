// Server-side Firebase Admin SDK initialization for @aurwell/website
// Used only in Server Components, API routes, and Server Actions
// NEVER import this in client components

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const APP_NAME = "aurwell-website-admin-v2";

function getAdminApp(): App {
  const existingApp = getApps().find((a) => a.name === APP_NAME);
  if (existingApp) {
    return existingApp;
  }

  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!privateKey || !privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    privateKey =
      "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDUF1ouhmQHIo/1\nZ/0oomGUNaqL1oAZquZYlu3AItPqykirtEFAouspnOD7Q8l4zm8MPj98la44hpyW\nRrMPhXvguq9MBP6gnbCCeIRvzzBwJWrUGxwFA9I8GZ6Mie3wzVcQAyn/k9KBYHxr\nxGMbZXK1TJ/WBEbzxgts9lXgfICuuPTWDzHxhctN8xDunU56bqL/4wm3exk93rhx\n0zJlBTkaxIt3QUovwXIqiB4z9l3b72ktj/PyHP9DdhboKpAH+j0AnrRJItz4eFkY\nyr2vp4In/mfONZLPfQ9YzNYQJTt44CBifudpX0/m22VL/EJdsHkRpmuaPWHDfxCt\nxEeJGtFXAgMBAAECggEAEgHuYEDjQU/Uu6UAQHD5EMwCfPkE/o9Qgd94TdxaWqo6\n9u+V34ncDNGksIpi35gqoyl6qBAbyL51KrU6AtL2LHCG7bdtPyN9/YK22LkIupzf\nfL7VTcyADyZFtfA7SaGSbZ03KNunzEa68BN7YebmxGOLHQq9hqxSaZ/76DsdJrhz\neh0RTAdIa0eM4/3esZmmocWLyeeVhxr4BQ8ItN1+1b0KTTmumEmLyGroRGu7ebEn\nDalNo9uzqSrqrcpX8EyTWgAwEZXJXUlKbr90N47mLaGNiQMhDh+PlMq78l07TU8j\ncMcr+tBO1GBbvsPNmz6t/q/8bu+tNEQlaYc9OFvoQQKBgQDy9CUIAf8pg6XBv8om\nEtdbWexQbzVLCpb89NRHrwk5VFLDAIfsmjBV4m9E2miOsEl0LYjgtEFnG8nqKUT1\nkJKRjROknkjyfxtLzkET8nUOkNR4YVHsxosvkAajPy9x7sTlOJq9hd6CaRkhk43w\nt0Q9uedeNN6620vvuE9uyGev5wKBgQDfevHm02X3CuDkIxXyToK2n/AZwZNJ3x7F\nestO3O8AkJ9PO6I93AGCzgTCMX3EUixMnV9r/+hjUU9I9hhClRVQt8iBL4qX6DD0\nHU8ihk5AcYF/MrTGFwy8v2k/0DAtDgiStYojuXVH1nXei8BldVkXVuHbAPWjw0bo\ndYcWDV5lEQKBgQDbtreWmlerr4bDxTKHZBqmXpg71ZaYmqcZdEBV45Gv6vY9q8lA\ny+BSi0idN/e+suZ6zoMu01UibhsYTOI0Qd6LCs5s3UiTJSgGUizAYVBDL+82Pqzc\nOGG/Tbzy/T1nB8vAkIRASUSFI466srp2qwZn3CvFIoMa8R+nV0NeqJY8mQKBgF3k\n2uO/Z/TOlkRj1WGzyMmQEyHPKeH8o4IXIHpm6ufS24w/ot/Yoq3hfzBT+OJWIBSk\nfiXzJCEuVWBzPSgkWQtL3Csi3VkLjh3SfqAjy5bZ2a2mkTs1Df3zcfYEs2kKn2F8\ncqilz/e5zFYPY2t9TUw4DbalBY+jiRQ75ODIByPxAoGBALYfIwmZrCI2Yb/aGPFN\nxKLA+1PTwtQQl6Wq3L0bm1PZmm+KVuvkilFD2dibejxPKWzSlfQps3W0KYmo6Mgu\nWyeHyH3YoCdPM2dC71ydgYitJc9jfuV7Nz1K6wtTdpp6caQd+g3HK0c9f5iGenz+\nj74yNHhkhAZuYqjcF7GG1syH\n-----END PRIVATE KEY-----\n";
  } else {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  return initializeApp(
    {
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "aurwell-2e48c",
        clientEmail:
          process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
          "firebase-adminsdk-fbsvc@aurwell-2e48c.iam.gserviceaccount.com",
        privateKey: privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    },
    APP_NAME
  );
}

export const adminAuth = getAuth(getAdminApp());
export const adminDb = getFirestore(getAdminApp());
export const adminStorage = getStorage(getAdminApp());
