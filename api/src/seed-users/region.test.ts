import { describe, expect, test } from "bun:test";
import { classifyRegionInput } from "./region.js";

describe("classifyRegionInput", () => {
  test("full postcodes", () => {
    expect(classifyRegionInput("E8 3PA")).toEqual({ kind: "postcode", value: "E8 3PA" });
    expect(classifyRegionInput("sw1a1aa")).toEqual({ kind: "postcode", value: "SW1A1AA" });
  });
  test("outcodes", () => {
    expect(classifyRegionInput("E8")).toEqual({ kind: "outcode", value: "E8" });
    expect(classifyRegionInput("N16")).toEqual({ kind: "outcode", value: "N16" });
  });
  test("place names", () => {
    expect(classifyRegionInput("Hackney")).toEqual({ kind: "place", value: "Hackney" });
    expect(classifyRegionInput("Stoke Newington, London")).toEqual({ kind: "place", value: "Stoke Newington, London" });
  });
});
