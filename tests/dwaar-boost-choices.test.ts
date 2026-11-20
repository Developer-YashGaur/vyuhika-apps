import { describe, expect, it } from "vitest";
import { boostChoices } from "@/lib/dwaar/boost-choices";

describe("boostChoices", () => {
  it("puts 'continue with my request' first when the match is good", () => {
    const list = boostChoices("abc", true);
    expect(list[0].id).toBe("request");
    expect(list[0].recommended).toBe(true);
    expect(list.filter((c) => c.recommended).length).toBe(1);
  });
  it("puts the PDF download first when the match is lower", () => {
    const list = boostChoices("abc", false);
    expect(list[0].id).toBe("pdf");
    expect(list[0].download).toBe(true);
  });
  it("always offers all four choices", () => {
    expect(boostChoices("abc", true).length).toBe(4);
    expect(boostChoices("abc", false).length).toBe(4);
  });
  it("makes a safe PDF link from the request id", () => {
    const pdf = boostChoices("a b/c", true).find((c) => c.id === "pdf");
    expect(pdf?.href).toBe("/apps/dwaar/requests/a%20b%2Fc/boost/pdf");
  });
});
