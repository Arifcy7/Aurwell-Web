"use client";

import dynamic from "next/dynamic";
import config from "../../../../sanity.config";

const NextStudio = dynamic(
  () => import("next-sanity/studio").then((mod) => mod.NextStudio),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#4a5d4e",
          background: "#f7f9f6",
        }}
      >
        <p>Loading Aurwell Studio...</p>
      </div>
    ),
  }
);

export function Studio() {
  return <NextStudio config={config} />;
}
