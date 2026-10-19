import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { auth, storage } from "@/lib/firebase/client";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function uploadImageFile(file: File, folderName: string): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be logged in to upload files.");
  }

  // Validate file size
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("File exceeds maximum allowed size of 5MB.");
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    throw new Error("Invalid file format. Only JPEG, PNG, WebP, AVIF, and GIF images are allowed.");
  }

  // Sanitize folder name and filename to avoid path traversal / special characters
  const cleanFolderName = folderName.replace(/[^a-zA-Z0-9_-]/g, "");
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
  const storagePath = `users/${currentUser.uid}/${cleanFolderName}/${Date.now()}_${cleanFileName}`;
  const storageRef = ref(storage, storagePath);

  // Upload the file with contentType metadata
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      null,
      (err) => {
        console.error("Firebase upload failed:", err);
        reject(new Error("Image upload failed. Please try again."));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (urlErr) {
          console.error("Failed to retrieve download URL:", urlErr);
          reject(new Error("Failed to retrieve uploaded image URL."));
        }
      }
    );
  });
}

export async function deleteImageFile(url: string): Promise<void> {
  if (!url) return;

  // Check if URL is from our Firebase Storage bucket
  const isFirebaseStorageUrl =
    url.includes("firebasestorage.googleapis.com") && url.includes("aurwell-2e48c");
  if (!isFirebaseStorageUrl) return;

  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
    console.log("Successfully deleted old image from storage:", url);
  } catch (err) {
    console.warn("Could not delete old image from storage (it may not exist):", err);
  }
}
