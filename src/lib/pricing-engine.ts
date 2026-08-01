// src/lib/pricing-engine.ts

import type { ServiceConfig } from "@/lib/service-configs";

/**
 * All dynamic-service price calculations live here.
 * Nothing here touches React state, sliders, or UI — pure functions only.
 */

/** State shape stored per service block for dynamic configs. */
export type ServiceConfigState =
  | {
    type: "quantity";
    values: { [fieldKey: string]: number };
    rates?: { [fieldKey: string]: number };
  }
  | {
    type: "dual-quantity";
    values: { [fieldKey: string]: number };
    rates?: { [fieldKey: string]: number };
  }
  | {
    type: "platform-select";
    selected: { [platformKey: string]: boolean };
    rates?: { [platformKey: string]: number };
  };

export function calculateQuantityPrice(
  config: ServiceConfig,
  state: ServiceConfigState
): number {
  if (config.type !== "quantity" || !config.field) return 0;
  if (state.type !== "quantity") return 0;

  const qty = Number(state.values[config.field.key] ?? config.field.defaultValue);
  const rate =
    state.rates?.[config.field.key] ??
    config.field.rate;

  return qty * rate;
}

export function calculateDualQuantityPrice(
  config: ServiceConfig,
  state: ServiceConfigState
): number {
  if (config.type !== "dual-quantity" || !config.fields) return 0;
  if (state.type !== "dual-quantity") return 0;

  const [fieldA, fieldB] = config.fields;
  const a = Number(state.values[fieldA.key] ?? fieldA.defaultValue);
  const b = Number(state.values[fieldB.key] ?? fieldB.defaultValue);

  // e.g. YouTube Editing: (videos * videoRate) + (minutes * minuteRate)
  // Matches spec: "Final price = Videos * Minutes" is actually additive per-unit rates,
  // confirmed against the brief's worked examples (videos priced independently of minutes).
  const rateA =
    state.rates?.[fieldA.key] ??
    fieldA.rate;

  const rateB =
    state.rates?.[fieldB.key] ??
    fieldB.rate;

  return a * rateA + b * rateB;
}

export function calculatePlatformSelectPrice(
  config: ServiceConfig,
  state: ServiceConfigState
): number {
  if (config.type !== "platform-select" || !config.platforms) return 0;
  if (state.type !== "platform-select") return 0;

  return config.platforms.reduce((sum, p) => {
    return state.selected[p.key] ? sum + p.rate : sum;
  }, 0);
}

/**
 * Master calculator — dispatches based on config.type.
 * Returns 0 if config/state types are mismatched or missing.
 */
export function calculateServicePrice(
  config: ServiceConfig,
  state: ServiceConfigState
): number {
  switch (config.type) {
    case "quantity":
      return calculateQuantityPrice(config, state);
    case "dual-quantity":
      return calculateDualQuantityPrice(config, state);
    case "platform-select":
      return calculatePlatformSelectPrice(config, state);
    default:
      return 0;
  }
}

/** Builds a default state object for a given config (used when a service is first added). */
export function getDefaultServiceConfigState(config: ServiceConfig): ServiceConfigState {
  switch (config.type) {
    case "quantity":
      return {
        type: "quantity",
        values: {
          [config.field!.key]: config.field!.defaultValue,
        },
        rates: {
          [config.field!.key]: config.field!.rate,
        },
      };
    case "dual-quantity": {
      const [a, b] = config.fields!;

      return {
        type: "dual-quantity",
        values: {
          [a.key]: a.defaultValue,
          [b.key]: b.defaultValue,
        },
        rates: {
          [a.key]: a.rate,
          [b.key]: b.rate,
        },
      };
    }
    case "platform-select":
      return { type: "platform-select", selected: {} };
    default:
      return { type: "quantity", values: {} };
  }
}