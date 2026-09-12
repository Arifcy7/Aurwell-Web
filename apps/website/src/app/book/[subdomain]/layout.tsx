import type { Metadata } from "next";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

type Props = {
  params: Promise<{ subdomain: string }> | { subdomain: string };
  children: React.ReactNode;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }> | { subdomain: string };
}): Promise<Metadata> {
  const resolvedParams = await params;
  const subdomain = resolvedParams?.subdomain;

  if (!subdomain) {
    return {
      title: "Online Booking Portal",
    };
  }

  try {
    let clinicId = subdomain;
    const subSnap = await getDoc(doc(db, "subdomains", subdomain.toLowerCase()));
    if (subSnap.exists()) {
      clinicId = subSnap.data().clinicId;
    }

    const clinicSnap = await getDoc(doc(db, "clinics", clinicId));
    if (clinicSnap.exists()) {
      const data = clinicSnap.data();
      const clinicName = data?.merchantName || "Clinic";
      const logo = data?.logoUrl;

      const iconsConfig: any = {};
      if (logo) {
        iconsConfig.icon = [{ url: logo }];
        iconsConfig.shortcut = [{ url: logo }];
        iconsConfig.apple = [{ url: logo }];
      }

      return {
        title: `${clinicName} – Online Booking`,
        description: data?.description || `Book your treatment appointments directly at ${clinicName}.`,
        icons: logo ? iconsConfig : undefined,
      };
    }
  } catch (e) {
    console.error("Error generating dynamic booking metadata:", e);
  }

  return {
    title: "Clinic Booking Portal",
  };
}

export default function BookingSubdomainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
