import { describe, expect, it } from "vitest";
import {
  calculateScore,
  classifyRisk,
  integrationReadinessFor,
  updateIntegrationRequirement,
  type Finding,
  type IntegrationCheck,
} from "@/lib/kyro-demo";

const finding = (overrides: Partial<Finding> = {}): Finding => ({
  id: "F-TEST",
  vendorId: "v-test",
  investigationId: "KY-TEST",
  title: "Evidence review needed",
  dimension: "Security & Privacy",
  severity: "High",
  confidence: 42,
  status: "Open",
  source: "Fictional document",
  summary: "Illustrative finding.",
  why: "Evidence is incomplete.",
  nextStep: "Request supporting evidence.",
  ...overrides,
});

describe("Kyro deterministic scoring", () => {
  it("uses the brief's score bands at 80, 60, and 40", () => {
    expect(classifyRisk(80)).toBe("Low");
    expect(classifyRisk(60)).toBe("Moderate");
    expect(classifyRisk(40)).toBe("High");
    expect(classifyRisk(39)).toBe("Critical");
  });

  it("uses the brief's High penalty and 25% security weight", () => {
    const result = calculateScore([finding()], ["Security & Privacy"]);
    expect(result.dimensionScores["Security & Privacy"]).toBe(75);
    expect(result.score).toBe(75);
    expect(result.risk).toBe("Moderate");
  });

  it("reduces a finding's penalty to zero when it is resolved", () => {
    const result = calculateScore([finding({ status: "Resolved" })], ["Security & Privacy"]);
    expect(result.dimensionScores["Security & Privacy"]).toBe(100);
    expect(result.score).toBe(100);
  });

  it("applies the brief's Medium and Informational penalties exactly", () => {
    const medium = calculateScore([finding({ severity: "Medium" })], ["Security & Privacy"]);
    const informational = calculateScore(
      [finding({ severity: "Informational" })],
      ["Security & Privacy"],
    );
    expect(medium.dimensionScores["Security & Privacy"]).toBe(88);
    expect(informational.dimensionScores["Security & Privacy"]).toBe(100);
  });

  it("applies the brief's Under review and Accepted risk factors", () => {
    const underReview = calculateScore(
      [finding({ severity: "High", status: "Under review" })],
      ["Security & Privacy"],
    );
    const accepted = calculateScore(
      [finding({ severity: "High", status: "Accepted risk" })],
      ["Security & Privacy"],
    );
    expect(underReview.dimensionScores["Security & Privacy"]).toBe(81.25);
    expect(accepted.dimensionScores["Security & Privacy"]).toBe(87.5);
  });

  it("weights Compliance at 25% in the default overall score", () => {
    const result = calculateScore(
      [finding({ severity: "Critical", dimension: "Compliance" })],
      undefined,
      "Conservative",
    );
    expect(result.dimensionScores.Compliance).toBe(60);
    expect(result.score).toBe(90);
  });

  it("keeps an unresolved Critical finding visible independently of the weighted score", () => {
    const result = calculateScore(
      [finding({ severity: "Critical", dimension: "Compliance" })],
      ["Compliance"],
    );
    expect(result.dimensionScores.Compliance).toBe(60);
    expect(result.score).toBe(60);
    expect(result.risk).toBe("Moderate");
    expect(result.unresolvedCritical).toBe(true);
  });

  it("reports evidence confidence separately from risk score", () => {
    const result = calculateScore([finding({ confidence: 34 })], ["Security & Privacy"]);
    expect(result.score).toBe(75);
    expect(result.confidence).toBe(34);
    expect(result.missingEvidence).toBe(1);
  });

  it("changes only the weighted result when the risk appetite changes", () => {
    const findings = [
      finding({ dimension: "Security & Privacy", severity: "High" }),
      finding({ id: "F-CLINICAL", dimension: "Clinical Evidence", severity: "Medium" }),
    ];
    const conservative = calculateScore(findings, undefined, "Conservative");
    const balanced = calculateScore(findings, undefined, "Balanced");
    const aggressive = calculateScore(findings, undefined, "Aggressive");
    expect(conservative.dimensionScores).toEqual(balanced.dimensionScores);
    expect(conservative.score).toBe(93);
    expect(balanced.score).toBe(93);
    expect(aggressive.score).toBe(94);
  });

  it("excludes unknown requirements from integration readiness", () => {
    const checks: IntegrationCheck[] = [
      {
        id: "I-COMPATIBLE",
        requirement: "FHIR R4",
        hospitalRequirement: "FHIR R4",
        status: "Compatible",
        evidence: "Fictional source",
        gap: "None",
        effort: "None",
        nextStep: "Validate locally",
        required: true,
      },
      {
        id: "I-PARTIAL",
        requirement: "HL7 v2",
        hospitalRequirement: "ADT",
        status: "Partial",
        evidence: "Fictional source",
        gap: "Mapping details missing",
        effort: "TBD",
        nextStep: "Request mapping",
        required: true,
      },
      {
        id: "I-UNKNOWN",
        requirement: "DICOMweb",
        hospitalRequirement: "PACS workflow",
        status: "Unknown",
        evidence: "No statement found",
        gap: "Unknown evidence",
        effort: "TBD",
        nextStep: "Request evidence",
        required: true,
      },
    ];
    expect(integrationReadinessFor(checks, (check) => check.status)).toBe(75);
    expect(integrationReadinessFor(checks.slice(2), (check) => check.status)).toBeNull();
  });

  it("updates exactly the chosen hospital integration requirement", () => {
    const checks: IntegrationCheck[] = [
      {
        id: "A",
        requirement: "FHIR",
        hospitalRequirement: "FHIR R4",
        status: "Unknown",
        evidence: "Fictional",
        gap: "Unknown",
        effort: "TBD",
        nextStep: "Request",
        required: true,
      },
      {
        id: "B",
        requirement: "HL7",
        hospitalRequirement: "HL7 v2",
        status: "Unknown",
        evidence: "Fictional",
        gap: "Unknown",
        effort: "TBD",
        nextStep: "Request",
        required: true,
      },
    ];
    const updated = updateIntegrationRequirement(checks, "A", "FHIR R5");
    expect(updated.map((check) => check.hospitalRequirement)).toEqual(["FHIR R5", "HL7 v2"]);
  });
});
