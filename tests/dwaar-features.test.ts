import { describe, expect, it } from "vitest";
import { boostPaymentsEnabled, jobsFeedEnabled } from "@/lib/dwaar/features";

describe("boostPaymentsEnabled", () => {
  it("is off by default", () => {
    expect(boostPaymentsEnabled({})).toBe(false);
    expect(boostPaymentsEnabled({ DWAAR_BOOST_ENABLED: "" })).toBe(false);
    expect(boostPaymentsEnabled({ DWAAR_BOOST_ENABLED: "false" })).toBe(false);
    expect(boostPaymentsEnabled({ DWAAR_BOOST_ENABLED: "1" })).toBe(false);
  });
  it("is on only for the word true", () => {
    expect(boostPaymentsEnabled({ DWAAR_BOOST_ENABLED: "true" })).toBe(true);
    expect(boostPaymentsEnabled({ DWAAR_BOOST_ENABLED: " TRUE " })).toBe(true);
  });
});

describe("jobsFeedEnabled", () => {
  it("is off unless the word true is set", () => {
    expect(jobsFeedEnabled({})).toBe(false);
    expect(jobsFeedEnabled({ DWAAR_JOBS_ENABLED: "1" })).toBe(false);
    expect(jobsFeedEnabled({ DWAAR_JOBS_ENABLED: " True " })).toBe(true);
  });
});
