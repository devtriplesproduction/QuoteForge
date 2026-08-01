// src/components/service-configurator/QuantitySlider.tsx

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { QuantityFieldConfig } from "@/lib/service-configs";

interface QuantitySliderProps {
  field: QuantityFieldConfig;

  value: number;

  rate: number;

  onChange: (value: number) => void;

  onRateChange: (rate: number) => void;

  currency: "INR" | "USD";
}

export default function QuantitySlider({
  field,
  value,
  rate,
  onRateChange,
  onChange,
  currency,
}: QuantitySliderProps) {
  const symbol = currency === "INR" ? "₹" : "$";
  const lineTotal = value * rate;

  return (
    <div className="space-y-5">

      {/* Price Per Unit */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide font-bold">
          Price Per Unit
        </Label>

        <Input
          type="number"
          value={rate}
          min={0}
          onChange={(e) =>
            onRateChange(Number(e.target.value) || 0)
          }
          className="h-12 rounded-2xl"
        />
      </div>

      {/* Quantity Slider */}
      <Slider
        value={[value]}
        min={field.min}
        max={field.max}
        step={field.step || 1}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />

      {/* Bottom Calculation */}
      <div className="grid grid-cols-[110px_30px_1fr_30px_1fr] items-center gap-3">

        {/* Quantity */}
        <Input
          type="number"
          min={field.min}
          max={field.max}
          value={value}
          onChange={(e) => {
            const next = Math.min(
              field.max,
              Math.max(field.min, Number(e.target.value) || field.min)
            );

            onChange(next);
          }}
          className="h-12 rounded-2xl text-center"
        />

        <div className="text-center text-xl">
          ×
        </div>

        <div className="text-center font-semibold">
          {symbol}{rate.toLocaleString()}
        </div>

        <div className="text-center text-xl">
          =
        </div>

        <div className="text-right font-bold text-2xl">
          {symbol}{lineTotal.toLocaleString()}
        </div>

      </div>

    </div>
  );
}