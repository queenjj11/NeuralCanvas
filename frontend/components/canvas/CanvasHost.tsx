"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/** three.js never blocks first paint: the scene bundle loads on the client only. */
const CanvasRoot = dynamic(() => import("./CanvasRoot").then((m) => m.CanvasRoot), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#08090f]" />,
});

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

export function CanvasHost() {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => setSupported(hasWebGL()), []);

  if (supported === false) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-[#08090f] px-6 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-sm text-foreground">
            This browser can&apos;t render the 3D network.
          </p>
          <p className="text-sm text-muted-foreground">
            Inference still works — the inspector below shows every activation as text.
          </p>
        </div>
      </div>
    );
  }

  if (supported === null) return <div className="absolute inset-0 bg-[#08090f]" />;

  return <CanvasRoot />;
}
