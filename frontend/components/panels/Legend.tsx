"use client";

import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ROWS: { visual: string; meaning: string; swatch?: string }[] = [
  { visual: "Neuron brightness", meaning: "How strongly that neuron activated" },
  { visual: "Connection thickness", meaning: "Weight magnitude, relative to the model's largest" },
  { visual: "Cyan", meaning: "Positive weight", swatch: "var(--accent-positive)" },
  { visual: "Magenta", meaning: "Negative weight", swatch: "var(--accent-negative)" },
  { visual: "Pulse brightness", meaning: "Contribution: upstream activation × weight" },
  { visual: "Dim neuron", meaning: "Dead ReLU — it output exactly zero" },
  { visual: "Ripple", meaning: "Prediction resolved, from the winning class", swatch: "var(--accent-signal)" },
];

/** Nothing on the canvas is decorative, so the mapping is documented in-product. */
export function Legend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          <HelpCircle className="size-3.5" aria-hidden />
          How to read this
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="mb-3 text-sm text-muted-foreground">
          Every value on screen comes from the model. Nothing is decorative.
        </p>
        <dl className="space-y-2">
          {ROWS.map((row) => (
            <div key={row.visual} className="flex gap-2 text-xs">
              <dt className="flex w-32 shrink-0 items-center gap-1.5 text-foreground">
                {row.swatch && (
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: row.swatch }}
                  />
                )}
                {row.visual}
              </dt>
              <dd className="text-muted-foreground">{row.meaning}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
