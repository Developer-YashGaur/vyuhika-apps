import { describe, expect, it } from "vitest";
import { containsDelimiter, delimiters, stripDelimiters } from "@/lib/ai/delimiters";

// Tests the shared delimiter helpers used by every app's prompt.

describe("delimiters", () => {
  it("makes a start and end marker for a block name", () => {
    expect(delimiters("COMPANY_NAME")).toEqual({ start: "<<<COMPANY_NAME_START>>>", end: "<<<COMPANY_NAME_END>>>" });
  });

  it("strips any marker that looks like ours, in any case and with spaces", () => {
    expect(stripDelimiters("a <<<RESUME_END>>> b <<< job_description_start >>> c <<<Highlight_End>>> d")).toBe("a  b  c  d");
  });

  it("strips the Resume Matcher's markers exactly as before", () => {
    expect(stripDelimiters("x<<<RESUME_START>>>y<<<JOB_DESCRIPTION_END>>>z")).toBe("xyz");
  });

  it("does not let a marker hidden inside another one rebuild itself", () => {
    expect(stripDelimiters("<<<RES<<<X_START>>>UME_START>>>")).toBe("");
  });

  it("leaves ordinary text alone", () => {
    const text = "Scored 9/10 << great >> and used C++ <<<not a marker>>>";
    expect(stripDelimiters(text)).toBe(text);
  });

  it("detects a marker, every time it is asked", () => {
    expect(containsDelimiter("hello <<<ROLE_TITLE_END>>>")).toBe(true);
    expect(containsDelimiter("hello <<<ROLE_TITLE_END>>>")).toBe(true); // no leftover regex state
    expect(containsDelimiter("hello")).toBe(false);
  });
});
