import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { auth, storage } from "@/lib/firebase/client";

export async function uploadImageFile(file: File, folderName: string): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be logged in to upload files.");
  }

  // Sanitize filename to avoid weird character issues
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
  const storagePath = `users/${currentUser.uid}/${folderName}/${Date.now()}_${cleanFileName}`;
  const storageRef = ref(storage, storagePath);

  // Upload the file
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      null, // We don't need intermediate progress since the page has a general form saving loading spinner
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
  const isFirebaseStorageUrl = url.includes("firebasestorage.googleapis.com") && url.includes("aurwell-2e48c");
  if (!isFirebaseStorageUrl) return;

  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
    console.log("Successfully deleted old image from storage:", url);
  } catch (err) {
    console.warn("Could not delete old image from storage (it may not exist):", err);
  }
}
