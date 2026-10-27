export type Risk = "Low" | "Moderate" | "High" | "Critical";
export type FindingSeverity = "Critical" | "High" | "Medium" | "Low" | "Informational";
export type Dimension =
  | "Compliance"
  | "Security & Privacy"
  | "Integration"
  | "Clinical Evidence"
  | "Financial"
  | "Operations";
export type FindingStatus = "Open" | "Under review" | "Accepted risk" | "Resolved" | "Rejected";
export type InvestigationStatus =
  "Draft" | "Queued" | "Running" | "Paused" | "Completed" | "Failed" | "Cancelled";

export type Vendor = {
  id: string;
  name: string;
  category: string;
  products: string[];
  summary: string;
  evidenceCompleteness: number;
  updated: string;
  archived?: boolean;
};

export type Investigation = {
  id: string;
  vendorId: string;
  product: string;
  status: InvestigationStatus;
  progress: number;
  stage: string;
  created: string;
  updated: string;
  dimensions: Dimension[];
  context: string;
};

export type Finding = {
  id: string;
  vendorId: string;
  investigationId: string;
  title: string;
  dimension: Dimension;
  severity: FindingSeverity;
  confidence: number;
  status: FindingStatus;
  source: string;
  summary: string;
  why: string;
  nextStep: string;
};

export type DemoDocument = {
  id: string;
  vendorId: string;
  name: string;
  type: string;
  uploaded: string;
  documentDate: string;
  expiry?: string;
  status: "Uploaded" | "Processing" | "Processed" | "Failed" | "Expiring" | "Expired";
  size: string;
  pages?: number;
  preview: string;
  simulated: boolean;
  mimeType?: string;
  investigationId?: string;
};

export type DemoAlert = {
  id: string;
  vendorId: string;
  type: string;
  severity: Risk;
  description: string;
  detected: string;
  status: "Open" | "Reviewed" | "Resolved";
  reviewer: string;
  note?: string;
};

export type TimelineEvent = {
  id: string;
  at: string;
  type: string;
  description: string;
  vendorId?: string;
  investigationId?: string;
};

export type DemoNotification = {
  id: string;
  title: string;
  detail: string;
  kind: string;
  read: boolean;
  vendorId?: string;
};

export type IntegrationCheck = {
  id: string;
  requirement: string;
  hospitalRequirement: string;
  status: "Compatible" | "Partial" | "Incompatible" | "Unknown";
  evidence: string;
  gap: string;
  effort: string;
  nextStep: string;
  required: boolean;
};

export type KyroState = {
  vendors: Vendor[];
  investigations: Investigation[];
  findings: Finding[];
  documents: DemoDocument[];
  alerts: DemoAlert[];
  timeline: TimelineEvent[];
  notifications: DemoNotification[];
  integration: IntegrationCheck[];
  integrationByVendor?: Record<string, IntegrationCheck[]>;
  appetite: "Conservative" | "Balanced" | "Aggressive";
  reviewPreferences?: boolean[];
  blueprintTasks: string[];
};

export const dimensions: Dimension[] = [
  "Compliance",
  "Security & Privacy",
  "Integration",
  "Clinical Evidence",
  "Financial",
  "Operations",
];

export const riskWeights: Record<Dimension, number> = {
  Compliance: 0.25,
  "Security & Privacy": 0.25,
  Integration: 0.2,
  "Clinical Evidence": 0.1,
  Financial: 0.1,
  Operations: 0.1,
};

export const riskWeightsByAppetite: Record<KyroState["appetite"], Record<Dimension, number>> = {
  Conservative: riskWeights,
  Balanced: {
    Compliance: 0.22,
    "Security & Privacy": 0.22,
    Integration: 0.2,
    "Clinical Evidence": 0.12,
    Financial: 0.12,
    Operations: 0.12,
  },
  Aggressive: {
    Compliance: 0.18,
    "Security & Privacy": 0.18,
    Integration: 0.2,
    "Clinical Evidence": 0.15,
    Financial: 0.14,
    Operations: 0.15,
  },
};

export const severityPenalties: Record<FindingSeverity, number> = {
  Informational: 0,
  Critical: 40,
  High: 25,
  Medium: 12,
  Low: 5,
};

const statusFactors: Record<FindingStatus, number> = {
  Open: 1,
  "Under review": 0.75,
  "Accepted risk": 0.5,
  Resolved: 0,
  Rejected: 0,
};

export const classifyRisk = (score: number): Risk =>
  score >= 80 ? "Low" : score >= 60 ? "Moderate" : score >= 40 ? "High" : "Critical";

export function calculateScore(
  findings: Finding[],
  applicable: Dimension[] = dimensions,
  appetite: KyroState["appetite"] = "Conservative",
) {
  const weights = riskWeightsByAppetite[appetite];
  const scores = {} as Record<Dimension, number>;
  for (const dimension of dimensions) {
    scores[dimension] = Math.max(
      0,
      100 -
        findings
          .filter((finding) => finding.dimension === dimension)
          .reduce(
            (total, finding) =>
              total + severityPenalties[finding.severity] * statusFactors[finding.status],
            0,
          ),
    );
  }
  const selectedDimensions = dimensions.filter((dimension) => applicable.includes(dimension));
  const totalWeight = selectedDimensions.reduce(
    (total, dimension) => total + weights[dimension],
    0,
  );
  const score =
    totalWeight === 0
      ? 0
      : Math.round(
          selectedDimensions.reduce(
            (total, dimension) => total + scores[dimension] * weights[dimension],
            0,
          ) / totalWeight,
        );
  const confidence = findings.length
    ? Math.round(
        findings.reduce((total, finding) => total + finding.confidence, 0) / findings.length,
      )
    : 0;
  const unresolvedCritical = findings.some(
    (finding) =>
      finding.severity === "Critical" && !["Resolved", "Rejected"].includes(finding.status),
  );
  return {
    score,
    risk: classifyRisk(score),
    dimensionScores: scores,
    confidence,
    missingEvidence: findings.filter(
      (finding) => finding.confidence < 60 && finding.status !== "Resolved",
    ).length,
    unresolvedCritical,
  };
}

export const seedState: KyroState = {
  vendors: [
    {
      id: "v-medicore",
      name: "MediCore Systems",
      category: "Hospital Information System",
      products: ["MediCore HIS"],
      summary:
        "Well-documented hospital information suite; several local interface details still need confirmation.",
      evidenceCompleteness: 78,
      updated: "2026-10-14",
    },
    {
      id: "v-pulsebridge",
      name: "PulseBridge Diagnostics",
      category: "Diagnostic integration platform",
      products: ["PulseBridge Connect"],
      summary:
        "Clinical documentation is available; DICOMweb conformance evidence remains incomplete.",
      evidenceCompleteness: 72,
      updated: "2026-10-12",
    },
    {
      id: "v-cloudward",
      name: "CloudWard Health",
      category: "Cloud healthcare platform",
      products: ["CloudWard Care Platform", "CloudWard Exchange"],
      summary:
        "Security documentation is incomplete and the supplied material does not resolve data residency.",
      evidenceCompleteness: 42,
      updated: "2026-10-16",
    },
    {
      id: "v-synapse",
      name: "Synapse Imaging",
      category: "Medical imaging software",
      products: ["Synapse View"],
      summary: "Documented DICOM workflows; partial evidence for FHIR interfaces.",
      evidenceCompleteness: 69,
      updated: "2026-10-10",
    },
    {
      id: "v-caremesh",
      name: "CareMesh Digital",
      category: "Digital health interoperability",
      products: ["CareMesh Exchange"],
      summary:
        "Strong standards documentation and clear implementation material in this fictional scenario.",
      evidenceCompleteness: 88,
      updated: "2026-10-15",
    },
    {
      id: "v-novaclinic",
      name: "NovaClinic Technologies",
      category: "Clinical decision support",
      products: ["NovaClinic Assist"],
      summary:
        "Independent clinical evidence is limited; several product claims remain vendor-stated.",
      evidenceCompleteness: 38,
      updated: "2026-10-11",
    },
  ],
  investigations: [
    {
      id: "KY-2026-041",
      vendorId: "v-cloudward",
      product: "CloudWard Care Platform",
      status: "Running",
      progress: 72,
      stage: "Skeptic review",
      created: "2026-10-12",
      updated: "2026-10-16",
      dimensions,
      context: "Asterion Medical Network",
    },
    {
      id: "KY-2026-039",
      vendorId: "v-pulsebridge",
      product: "PulseBridge Connect",
      status: "Running",
      progress: 64,
      stage: "Specialist investigations",
      created: "2026-10-10",
      updated: "2026-10-15",
      dimensions,
      context: "Asterion Medical Network · Diagnostics",
    },
    {
      id: "KY-2026-036",
      vendorId: "v-caremesh",
      product: "CareMesh Exchange",
      status: "Completed",
      progress: 100,
      stage: "Final assessment",
      created: "2026-10-07",
      updated: "2026-10-14",
      dimensions,
      context: "Asterion Medical Network · Central IT",
    },
    {
      id: "KY-2026-034",
      vendorId: "v-medicore",
      product: "MediCore HIS",
      status: "Paused",
      progress: 38,
      stage: "Deterministic checks",
      created: "2026-10-06",
      updated: "2026-10-13",
      dimensions,
      context: "Asterion Medical Network",
    },
    {
      id: "KY-2026-032",
      vendorId: "v-novaclinic",
      product: "NovaClinic Assist",
      status: "Completed",
      progress: 100,
      stage: "Final assessment",
      created: "2026-10-05",
      updated: "2026-10-11",
      dimensions,
      context: "Asterion Medical Network · Clinical review",
    },
    {
      id: "KY-2026-030",
      vendorId: "v-synapse",
      product: "Synapse View",
      status: "Completed",
      progress: 100,
      stage: "Final assessment",
      created: "2026-10-03",
      updated: "2026-10-10",
      dimensions,
      context: "Asterion Medical Network · PACS",
    },
  ],
  findings: [
    {
      id: "F-101",
      vendorId: "v-cloudward",
      investigationId: "KY-2026-041",
      title: "Data residency remains unestablished",
      dimension: "Compliance",
      severity: "High",
      confidence: 42,
      status: "Open",
      source: "Data Privacy and Residency Statement",
      summary:
        "The supplied statement does not identify the location of production data or backups.",
      why: "Asterion requires India data residency; the available evidence does not resolve this requirement.",
      nextStep: "Request a region-specific architecture and backup residency statement.",
    },
    {
      id: "F-102",
      vendorId: "v-cloudward",
      investigationId: "KY-2026-041",
      title: "Independent key-management evidence missing",
      dimension: "Security & Privacy",
      severity: "High",
      confidence: 55,
      status: "Under review",
      source: "Vendor Security Assessment",
      summary:
        "Encryption at rest is described, but no independent evidence for key-management controls is included.",
      why: "The statement is vendor-provided and does not establish operational control effectiveness.",
      nextStep:
        "Request the current independent security report and key-management control evidence.",
    },
    {
      id: "F-103",
      vendorId: "v-cloudward",
      investigationId: "KY-2026-041",
      title: "Penetration-test report not supplied",
      dimension: "Security & Privacy",
      severity: "High",
      confidence: 30,
      status: "Open",
      source: "Evidence register",
      summary: "No current penetration-test report was present in the illustrative evidence pack.",
      why: "Security testing scope and remediation cannot be evaluated from the provided material.",
      nextStep:
        "Request a recent report and remediation summary under appropriate confidentiality.",
    },
    {
      id: "F-104",
      vendorId: "v-cloudward",
      investigationId: "KY-2026-041",
      title: "DICOMweb capability not established",
      dimension: "Integration",
      severity: "Medium",
      confidence: 48,
      status: "Open",
      source: "Product API Documentation",
      summary:
        "The scenario documentation mentions HL7 v2 but does not establish DICOMweb support.",
      why: "Asterion's PACS workflow requires DICOMweb; another DICOM workflow is not equivalent evidence.",
      nextStep: "Request a DICOMweb conformance statement and a technical interface walkthrough.",
    },
    {
      id: "F-105",
      vendorId: "v-cloudward",
      investigationId: "KY-2026-041",
      title: "24/7 incident response commitment unclear",
      dimension: "Operations",
      severity: "Medium",
      confidence: 62,
      status: "Open",
      source: "Service Level Agreement",
      summary:
        "Business-hours support is described; a 24/7 incident response commitment was not found.",
      why: "Incident escalation expectations need to be explicit for the intended deployment.",
      nextStep: "Confirm severity-based response targets and escalation coverage.",
    },
    {
      id: "F-106",
      vendorId: "v-pulsebridge",
      investigationId: "KY-2026-039",
      title: "DICOMweb conformance documentation incomplete",
      dimension: "Integration",
      severity: "High",
      confidence: 66,
      status: "Open",
      source: "PulseBridge API Guide",
      summary: "DICOMweb endpoints are not identified in the supplied guide.",
      why: "The required PACS workflow cannot be validated from the provided material.",
      nextStep: "Request endpoint and conformance test documentation.",
    },
    {
      id: "F-107",
      vendorId: "v-pulsebridge",
      investigationId: "KY-2026-039",
      title: "Clinical outcome claim needs independent support",
      dimension: "Clinical Evidence",
      severity: "Low",
      confidence: 52,
      status: "Under review",
      source: "Clinical Evidence Summary",
      summary: "The claimed workflow outcome is supported by vendor material only in this example.",
      why: "The evidence does not establish generalizable clinical outcomes.",
      nextStep: "Request study protocol, population, outcomes, and limitations.",
    },
    {
      id: "F-108",
      vendorId: "v-caremesh",
      investigationId: "KY-2026-036",
      title: "Implementation scope requires local validation",
      dimension: "Integration",
      severity: "Low",
      confidence: 79,
      status: "Resolved",
      source: "CareMesh Interoperability Guide",
      summary:
        "The supplied guide describes FHIR R4 and HL7 v2 interfaces; local test planning remains necessary.",
      why: "Standards references alone do not validate site-specific implementation.",
      nextStep: "Confirm interface mapping in discovery workshops.",
    },
    {
      id: "F-109",
      vendorId: "v-novaclinic",
      investigationId: "KY-2026-032",
      title: "Independent clinical evidence is limited",
      dimension: "Clinical Evidence",
      severity: "High",
      confidence: 34,
      status: "Open",
      source: "Clinical Evidence Summary",
      summary:
        "No independent study was supplied for the product's stated decision-support outcomes.",
      why: "The claim should not be treated as independently established.",
      nextStep: "Request study materials and clarify intended-use boundaries.",
    },
    {
      id: "F-110",
      vendorId: "v-novaclinic",
      investigationId: "KY-2026-032",
      title: "Regulatory claim is vendor-stated",
      dimension: "Compliance",
      severity: "High",
      confidence: 41,
      status: "Open",
      source: "Regulatory Compliance Certificate",
      summary:
        "The supplied material does not establish independent verification of the stated claim.",
      why: "Vendor statements and independently verified facts are different evidence classes.",
      nextStep: "Request applicable product documentation and independent verification details.",
    },
    {
      id: "F-111",
      vendorId: "v-synapse",
      investigationId: "KY-2026-030",
      title: "FHIR interface detail is partial",
      dimension: "Integration",
      severity: "Medium",
      confidence: 73,
      status: "Open",
      source: "Synapse API Documentation",
      summary: "DICOM workflows are described; FHIR resource coverage is not fully specified.",
      why: "The hospital's target integration scope depends on resource-level compatibility.",
      nextStep: "Confirm resource coverage and version through a technical review.",
    },
    {
      id: "F-112",
      vendorId: "v-medicore",
      investigationId: "KY-2026-034",
      title: "Identity-provider mapping needs confirmation",
      dimension: "Integration",
      severity: "Medium",
      confidence: 70,
      status: "Open",
      source: "MediCore Architecture Overview",
      summary:
        "The material describes SSO, but Asterion's identity-provider mapping is not specified.",
      why: "Authentication compatibility requires site-specific configuration evidence.",
      nextStep: "Validate supported federation protocol and role mapping.",
    },
  ],
  documents: [
    {
      id: "D-201",
      vendorId: "v-cloudward",
      name: "Vendor Security Assessment.pdf",
      type: "Security Assessment",
      uploaded: "2026-10-12",
      documentDate: "2026-09-30",
      status: "Processed",
      size: "2.4 MB",
      pages: 18,
      preview:
        "Fictional excerpt: encryption at rest is described. Independent key-management evidence is not included in this illustrative file record.",
      simulated: true,
      investigationId: "KY-2026-041",
    },
    {
      id: "D-202",
      vendorId: "v-cloudward",
      name: "Data Privacy and Residency Statement.pdf",
      type: "Privacy Policy",
      uploaded: "2026-10-12",
      documentDate: "2026-08-14",
      status: "Processed",
      size: "840 KB",
      pages: 7,
      preview:
        "Fictional excerpt: regional hosting options are discussed, but production and backup regions are not identified.",
      simulated: true,
      investigationId: "KY-2026-041",
    },
    {
      id: "D-203",
      vendorId: "v-cloudward",
      name: "Product API Documentation.pdf",
      type: "API Documentation",
      uploaded: "2026-10-12",
      documentDate: "2026-07-02",
      status: "Processed",
      size: "1.8 MB",
      pages: 26,
      preview:
        "Fictional excerpt: HL7 v2 is referenced. No explicit DICOMweb conformance statement appears in this demo record.",
      simulated: true,
      investigationId: "KY-2026-041",
    },
    {
      id: "D-204",
      vendorId: "v-pulsebridge",
      name: "Clinical Evidence Summary.pdf",
      type: "Clinical Study",
      uploaded: "2026-10-10",
      documentDate: "2026-06-18",
      status: "Processed",
      size: "1.1 MB",
      pages: 12,
      preview:
        "Fictional excerpt: a workflow outcome is described in a vendor-authored summary; independent verification is not established.",
      simulated: true,
      investigationId: "KY-2026-039",
    },
    {
      id: "D-205",
      vendorId: "v-caremesh",
      name: "Interoperability Guide.pdf",
      type: "API Documentation",
      uploaded: "2026-10-08",
      documentDate: "2026-09-02",
      status: "Processed",
      size: "3.2 MB",
      pages: 31,
      preview:
        "Fictional excerpt: FHIR R4 resources and HL7 v2 interfaces are documented for the demo scenario.",
      simulated: true,
      investigationId: "KY-2026-036",
    },
    {
      id: "D-206",
      vendorId: "v-cloudward",
      name: "Service Level Agreement.pdf",
      type: "SLA",
      uploaded: "2026-10-12",
      documentDate: "2026-05-20",
      expiry: "2027-01-15",
      status: "Expiring",
      size: "620 KB",
      pages: 9,
      preview:
        "Fictional excerpt: business-hours support is specified; 24/7 incident-response terms were not identified in this demo record.",
      simulated: true,
      investigationId: "KY-2026-041",
    },
    {
      id: "D-207",
      vendorId: "v-pulsebridge",
      name: "PulseBridge API Guide.pdf",
      type: "API Documentation",
      uploaded: "2026-10-10",
      documentDate: "2026-08-28",
      status: "Processed",
      size: "1.6 MB",
      pages: 22,
      preview:
        "Fictional excerpt: HL7 v2 workflows are described. No DICOMweb endpoints or conformance test record were included in this demo scenario.",
      simulated: true,
      investigationId: "KY-2026-039",
    },
    {
      id: "D-208",
      vendorId: "v-novaclinic",
      name: "Clinical Evidence Summary.pdf",
      type: "Clinical Study",
      uploaded: "2026-10-06",
      documentDate: "2026-07-14",
      status: "Processed",
      size: "920 KB",
      pages: 11,
      preview:
        "Fictional excerpt: a product outcome is claimed. Independent study materials were not supplied in this sample scenario.",
      simulated: true,
      investigationId: "KY-2026-032",
    },
    {
      id: "D-209",
      vendorId: "v-novaclinic",
      name: "Regulatory Compliance Certificate.pdf",
      type: "Compliance Certificate",
      uploaded: "2026-10-06",
      documentDate: "2026-02-11",
      status: "Processed",
      size: "510 KB",
      pages: 3,
      preview:
        "Fictional excerpt: the vendor states a regulatory claim. The supplied demo record contains no independent verification result.",
      simulated: true,
      investigationId: "KY-2026-032",
    },
    {
      id: "D-210",
      vendorId: "v-synapse",
      name: "Synapse API Documentation.pdf",
      type: "API Documentation",
      uploaded: "2026-10-05",
      documentDate: "2026-09-12",
      status: "Processed",
      size: "2.2 MB",
      pages: 24,
      preview:
        "Fictional excerpt: DICOM workflows are described; FHIR resource-level support remains partially specified.",
      simulated: true,
      investigationId: "KY-2026-030",
    },
    {
      id: "D-211",
      vendorId: "v-medicore",
      name: "MediCore Architecture Overview.pdf",
      type: "Architecture Diagram",
      uploaded: "2026-10-06",
      documentDate: "2026-08-02",
      status: "Processed",
      size: "1.3 MB",
      pages: 14,
      preview:
        "Fictional excerpt: single sign-on is mentioned; the Asterion identity-provider mapping is not specified.",
      simulated: true,
      investigationId: "KY-2026-034",
    },
    {
      id: "D-212",
      vendorId: "v-cloudward",
      name: "Penetration Test Report.pdf",
      type: "Penetration Test Report",
      uploaded: "2026-10-12",
      documentDate: "2026-10-12",
      status: "Failed",
      size: "—",
      preview: "No penetration-test report was supplied in this fictional scenario.",
      simulated: true,
      investigationId: "KY-2026-041",
    },
    {
      id: "D-213",
      vendorId: "v-cloudward",
      name: "Financial Disclosure.pdf",
      type: "Financial Disclosure",
      uploaded: "2026-10-12",
      documentDate: "2026-08-20",
      status: "Processed",
      size: "440 KB",
      pages: 5,
      preview:
        "Fictional excerpt: summary information was supplied; independent financial review is not included.",
      simulated: true,
      investigationId: "KY-2026-041",
    },
  ],
  alerts: [
    {
      id: "AL-301",
      vendorId: "v-cloudward",
      type: "Document approaching expiry",
      severity: "Moderate",
      description:
        "The illustrative service agreement record is approaching its listed expiry date.",
      detected: "2026-10-16",
      status: "Open",
      reviewer: "Unassigned",
    },
    {
      id: "AL-302",
      vendorId: "v-cloudward",
      type: "Penetration-test evidence missing",
      severity: "High",
      description:
        "No current penetration-test report is present in the scenario evidence register.",
      detected: "2026-10-15",
      status: "Open",
      reviewer: "Security review",
    },
    {
      id: "AL-303",
      vendorId: "v-pulsebridge",
      type: "Integration evidence requires review",
      severity: "Moderate",
      description: "DICOMweb conformance remains unestablished by supplied material.",
      detected: "2026-10-14",
      status: "Reviewed",
      reviewer: "Integration team",
    },
    {
      id: "AL-304",
      vendorId: "v-novaclinic",
      type: "Clinical claim requires review",
      severity: "High",
      description:
        "An outcome claim is not supported by independent evidence in this fictional scenario.",
      detected: "2026-10-13",
      status: "Open",
      reviewer: "Clinical review",
    },
    {
      id: "AL-305",
      vendorId: "v-cloudward",
      type: "Residency evidence unresolved",
      severity: "High",
      description: "The scenario evidence does not identify production and backup data locations.",
      detected: "2026-10-12",
      status: "Open",
      reviewer: "Privacy review",
    },
  ],
  timeline: [
    {
      id: "T-401",
      at: "2026-10-16T10:20:00",
      type: "Finding updated",
      description: "Security finding moved to under review.",
      vendorId: "v-cloudward",
      investigationId: "KY-2026-041",
    },
    {
      id: "T-402",
      at: "2026-10-16T09:42:00",
      type: "Evidence extracted",
      description: "A simulated document record was indexed for review.",
      vendorId: "v-cloudward",
      investigationId: "KY-2026-041",
    },
    {
      id: "T-403",
      at: "2026-10-15T16:10:00",
      type: "Integration gap identified",
      description: "DICOMweb support remains unestablished by the supplied scenario material.",
      vendorId: "v-cloudward",
      investigationId: "KY-2026-041",
    },
    {
      id: "T-404",
      at: "2026-10-15T14:28:00",
      type: "Skeptic challenge",
      description:
        "The evidence class was challenged as vendor-stated, not independently verified.",
      vendorId: "v-cloudward",
      investigationId: "KY-2026-041",
    },
    {
      id: "T-405",
      at: "2026-10-14T12:05:00",
      type: "Score recalculated",
      description: "Decision-support score updated after evidence review.",
      vendorId: "v-caremesh",
      investigationId: "KY-2026-036",
    },
    {
      id: "T-406",
      at: "2026-10-14T11:30:00",
      type: "Agent completed",
      description: "The simulated integration specialist completed its review sequence.",
      vendorId: "v-caremesh",
      investigationId: "KY-2026-036",
    },
  ],
  notifications: [
    {
      id: "N-501",
      title: "High-risk finding",
      detail: "Data residency remains unestablished for CloudWard Health.",
      kind: "Finding",
      read: false,
      vendorId: "v-cloudward",
    },
    {
      id: "N-502",
      title: "Integration gap",
      detail: "DICOMweb evidence is incomplete for PulseBridge Diagnostics.",
      kind: "Integration",
      read: false,
      vendorId: "v-pulsebridge",
    },
    {
      id: "N-503",
      title: "Document expiry",
      detail: "A service agreement record is approaching its listed expiry.",
      kind: "Document",
      read: false,
      vendorId: "v-cloudward",
    },
    {
      id: "N-504",
      title: "Investigation completed",
      detail: "CareMesh Digital's illustrative assessment is complete.",
      kind: "Investigation",
      read: true,
      vendorId: "v-caremesh",
    },
  ],
  integration: [
    {
      id: "I-601",
      requirement: "HL7 v2",
      hospitalRequirement: "ADT, ORM, and ORU workflows",
      status: "Partial",
      evidence: "Vendor API guide references HL7 v2.",
      gap: "Message coverage and mappings require technical review.",
      effort: "4–8 weeks",
      nextStep: "Confirm message profiles and interface engine mapping.",
      required: true,
    },
    {
      id: "I-602",
      requirement: "HL7 FHIR R4",
      hospitalRequirement: "FHIR R4 resource-level interfaces",
      status: "Unknown",
      evidence: "No explicit FHIR R4 version statement in this scenario.",
      gap: "Supported resources and version are not established.",
      effort: "To be determined",
      nextStep: "Request a resource and version conformance statement.",
      required: true,
    },
    {
      id: "I-603",
      requirement: "DICOM",
      hospitalRequirement: "PACS image exchange",
      status: "Partial",
      evidence: "DICOM workflows are referenced; conformance details are incomplete.",
      gap: "Supported services and roles are not fully documented.",
      effort: "2–6 weeks",
      nextStep: "Confirm DICOM services and test against the Asterion PACS.",
      required: true,
    },
    {
      id: "I-604",
      requirement: "DICOMweb",
      hospitalRequirement: "PACS web workflow support",
      status: "Unknown",
      evidence: "No explicit DICOMweb statement found in supplied demo material.",
      gap: "DICOM C-STORE does not establish DICOMweb compatibility.",
      effort: "To be determined",
      nextStep: "Request DICOMweb conformance evidence and test results.",
      required: true,
    },
    {
      id: "I-605",
      requirement: "ABDM interoperability",
      hospitalRequirement: "Applicable ABDM interoperability requirements",
      status: "Unknown",
      evidence: "No applicable implementation detail in the scenario pack.",
      gap: "Applicability and implementation evidence need review.",
      effort: "To be determined",
      nextStep: "Confirm applicability with qualified local reviewers.",
      required: true,
    },
    {
      id: "I-606",
      requirement: "Authentication",
      hospitalRequirement: "Central identity-provider integration",
      status: "Partial",
      evidence: "SSO is mentioned without protocol and role details.",
      gap: "Identity mapping and supported federation protocol remain unclear.",
      effort: "2–4 weeks",
      nextStep: "Request federation protocol and role-mapping details.",
      required: true,
    },
    {
      id: "I-607",
      requirement: "Deployment model",
      hospitalRequirement: "Review deployment and network boundaries",
      status: "Partial",
      evidence: "Cloud hosting is described at a high level.",
      gap: "Environment boundaries and operational controls need confirmation.",
      effort: "2–5 weeks",
      nextStep: "Review a deployment architecture with hospital IT.",
      required: true,
    },
    {
      id: "I-608",
      requirement: "Data residency",
      hospitalRequirement: "India data residency",
      status: "Unknown",
      evidence: "The supplied statement does not identify production or backup regions.",
      gap: "Location of production data and backups is unestablished.",
      effort: "To be determined",
      nextStep: "Request region-specific architecture and contractual terms.",
      required: true,
    },
  ],
  integrationByVendor: {},
  appetite: "Conservative",
  reviewPreferences: [true, false, true, true],
  blueprintTasks: [],
};

export const agentRoster = [
  {
    id: "compliance",
    name: "Compliance Agent",
    dimension: "Compliance" as Dimension,
    initials: "CO",
    task: "Reviewing applicability and supporting documentation.",
  },
  {
    id: "clinical",
    name: "Clinical Evidence Agent",
    dimension: "Clinical Evidence" as Dimension,
    initials: "CE",
    task: "Checking study context, population, and claims.",
  },
  {
    id: "security",
    name: "Security & Privacy Agent",
    dimension: "Security & Privacy" as Dimension,
    initials: "SP",
    task: "Examining security disclosures and privacy evidence.",
  },
  {
    id: "financial",
    name: "Financial Agent",
    dimension: "Financial" as Dimension,
    initials: "FI",
    task: "Reviewing available business-resilience material.",
  },
  {
    id: "integration",
    name: "Integration Fit Agent",
    dimension: "Integration" as Dimension,
    initials: "IN",
    task: "Comparing product interfaces against hospital requirements.",
  },
  {
    id: "operations",
    name: "Operations Agent",
    dimension: "Operations" as Dimension,
    initials: "OP",
    task: "Reviewing service and deployment commitments.",
  },
  {
    id: "skeptic",
    name: "Skeptic Agent",
    dimension: "Compliance" as Dimension,
    initials: "SK",
    task: "Challenging unsupported conclusions and evidence gaps.",
  },
];

export const getVendorRisk = (state: KyroState, vendorId: string) =>
  calculateScore(
    state.findings.filter((finding) => finding.vendorId === vendorId),
    dimensions,
    state.appetite,
  );

export const integrationReadiness = (checks: IntegrationCheck[]) => {
  const known = checks.filter((check) => check.required && check.status !== "Unknown");
  if (!known.length) return null;
  const compatible = known.filter((check) => check.status === "Compatible").length;
  const partial = known.filter((check) => check.status === "Partial").length;
  return Math.round((100 * (compatible + 0.5 * partial)) / known.length);
};

export const integrationReadinessFor = (
  checks: IntegrationCheck[],
  vendorCapability: (check: IntegrationCheck) => IntegrationCheck["status"],
) => {
  const known = checks
    .filter((check) => check.required)
    .map((check) => ({ status: vendorCapability(check) }))
    .filter((item) => item.status !== "Unknown");
  if (!known.length) return null;
  const compatible = known.filter((item) => item.status === "Compatible").length;
  const partial = known.filter((item) => item.status === "Partial").length;
  return Math.round((100 * (compatible + 0.5 * partial)) / known.length);
};

export const getIntegrationChecksForVendor = (state: KyroState, vendorId: string) => {
  const explicit = state.integrationByVendor?.[vendorId];
  if (explicit) return explicit;
  if (vendorId === "v-cloudward") return state.integration;
  const checks = state.integration.map((check) => ({
    ...check,
    status: "Unknown" as const,
    evidence: "No vendor-specific capability record in this fictional scenario.",
    gap: "No vendor-specific evidence has been added for this requirement.",
    nextStep: "Request evidence from this fictional vendor before assessing compatibility.",
  }));
  if (vendorId === "v-caremesh") {
    return checks.map((check) => {
      if (check.requirement === "HL7 FHIR R4") {
        return {
          ...check,
          status: "Compatible" as const,
          evidence: "Fictional interoperability guide lists selected FHIR R4 resources.",
          gap: "Local resource mapping and endpoint validation remain necessary.",
          nextStep: "Validate resource mappings in a non-production test environment.",
        };
      }
      if (check.requirement === "HL7 v2") {
        return {
          ...check,
          status: "Compatible" as const,
          evidence: "Fictional guide lists ADT and ORU message examples.",
          gap: "Confirm local interface-engine mappings.",
          nextStep: "Review message profiles with the hospital integration team.",
        };
      }
      return check;
    });
  }
  if (vendorId === "v-pulsebridge") {
    return checks.map((check) =>
      check.requirement === "DICOMweb"
        ? {
            ...check,
            status: "Partial" as const,
            evidence:
              "Fictional API guide references an image web workflow but provides no conformance record.",
            gap: "Supported DICOMweb services and conformance have not been established.",
            nextStep: "Request endpoint and conformance-test details.",
          }
        : check,
    );
  }
  return checks;
};

export function updateIntegrationRequirement(
  checks: IntegrationCheck[],
  id: string,
  hospitalRequirement: string,
) {
  return checks.map((check) => (check.id === id ? { ...check, hospitalRequirement } : check));
}

export const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function readSavedState(): KyroState {
  try {
    const saved = window.localStorage.getItem("kyro-demo-v1");
    if (!saved) return structuredClone(seedState);
    const parsed: unknown = JSON.parse(saved);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "vendors" in parsed &&
      Array.isArray(parsed.vendors) &&
      "investigations" in parsed &&
      Array.isArray(parsed.investigations) &&
      "findings" in parsed &&
      Array.isArray(parsed.findings) &&
      "documents" in parsed &&
      Array.isArray(parsed.documents) &&
      "alerts" in parsed &&
      Array.isArray(parsed.alerts) &&
      "timeline" in parsed &&
      Array.isArray(parsed.timeline) &&
      "notifications" in parsed &&
      Array.isArray(parsed.notifications) &&
      "integration" in parsed &&
      Array.isArray(parsed.integration)
    ) {
      const state = {
        ...(parsed as KyroState),
        findings: (parsed as KyroState).findings.map((finding) =>
          (finding.severity as string) === "Moderate"
            ? { ...finding, severity: "Medium" as const }
            : finding,
        ),
        documents: (parsed as KyroState).documents.map((doc) =>
          doc.simulated === false
            ? {
                ...doc,
                simulated: true,
                preview: `Simulated extraction only. Saved file contents were removed from this browser-only demo for ${doc.name}.`,
              }
            : doc,
        ),
        integrationByVendor: (parsed as KyroState).integrationByVendor ?? {},
        appetite: (parsed as KyroState).appetite ?? "Conservative",
        reviewPreferences: (parsed as KyroState).reviewPreferences ?? [true, false, true, true],
        blueprintTasks: (parsed as KyroState).blueprintTasks ?? [],
      };
      window.localStorage.setItem("kyro-demo-v1", JSON.stringify(state));
      return state;
    }
  } catch {
    return structuredClone(seedState);
  }
  return structuredClone(seedState);
}

export async function simulateOperation<T>(result: T, delay = 550): Promise<T> {
  await new Promise((resolve) => window.setTimeout(resolve, delay));
  return result;
}

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );
