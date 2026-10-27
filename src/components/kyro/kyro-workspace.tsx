import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpenCheck,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  CloudUpload,
  FileCheck2,
  FileJson2,
  FileText,
  Filter,
  Gauge,
  GitBranch,
  Globe2,
  HelpCircle,
  History,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageSquare,
  Network,
  PanelLeftClose,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Table2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  agentRoster,
  calculateScore,
  classifyRisk,
  createId,
  dimensions,
  formatDate,
  getIntegrationChecksForVendor,
  getVendorRisk,
  integrationReadiness,
  readSavedState,
  riskWeightsByAppetite,
  seedState,
  simulateOperation,
  updateIntegrationRequirement,
  severityPenalties,
  type DemoAlert,
  type DemoDocument,
  type Dimension,
  type Finding,
  type FindingSeverity,
  type FindingStatus,
  type IntegrationCheck,
  type Investigation,
  type InvestigationStatus,
  type KyroState,
  type Risk,
  type TimelineEvent,
  type Vendor,
} from "@/lib/kyro-demo";

type View =
  | "Overview"
  | "Investigations"
  | "Vendors"
  | "Documents"
  | "Integration Fit"
  | "Risk Monitoring"
  | "Reports"
  | "Settings"
  | "Investigation detail"
  | "Timeline";
type NavItem = { label: View; icon: LucideIcon };
const navItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Investigations", icon: Search },
  { label: "Vendors", icon: Building2 },
  { label: "Documents", icon: FileText },
  { label: "Integration Fit", icon: Network },
  { label: "Risk Monitoring", icon: Activity },
  { label: "Reports", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];
const stageNames = [
  "Evidence collection",
  "Document extraction",
  "Deterministic checks",
  "Specialist investigations",
  "Skeptic review",
  "Trust score calculation",
  "Final assessment",
];
const dimensionShort: Record<Dimension, string> = {
  Compliance: "Compliance",
  "Security & Privacy": "Security & privacy",
  Integration: "Integration",
  "Clinical Evidence": "Clinical evidence",
  Financial: "Financial",
  Operations: "Operations",
};
const today = () => new Date().toISOString().slice(0, 10);
const getRiskClass = (risk: Risk | FindingSeverity) =>
  `risk-${risk === "Medium" ? "moderate" : risk === "Informational" ? "low" : risk.toLowerCase()}`;
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

function Metric({
  label,
  value,
  note,
  icon: Icon,
  onClick,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  note: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: string;
}) {
  return (
    <button className="kyro-metric" onClick={onClick} aria-label={`${label}: ${value}. ${note}`}>
      <span className={`kyro-metric-icon ${tone}`}>
        <Icon size={17} />
      </span>
      <span className="kyro-metric-label">{label}</span>
      <strong>{value}</strong>
      <span className="kyro-metric-note">
        {note}
        <ChevronRight size={13} />
      </span>
    </button>
  );
}

function RiskBadge({ risk }: { risk: Risk | FindingSeverity }) {
  const tone =
    risk === "Medium" ? "moderate" : risk === "Informational" ? "low" : risk.toLowerCase();
  return (
    <span className={`kyro-risk risk-${tone}`}>
      <i />
      {risk}
    </span>
  );
}
function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={`kyro-status ${tone}`}>{children}</span>;
}

function Panel({
  title,
  eyebrow,
  action,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`kyro-panel ${className}`}>
      <header className="kyro-panel-head">
        <div>
          {eyebrow && <div className="kyro-eyebrow">{eyebrow}</div>}
          <h2>{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function MiniModal({
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="kyro-modal-scrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`kyro-modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="kyro-modal-head">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <Button variant="ghost" size="icon" aria-label="Close dialog" onClick={onClose}>
            <X />
          </Button>
        </header>
        {children}
      </section>
    </div>
  );
}

function createDemoPdf(title: string, vendor: string, ref: string) {
  const date = formatDate(today());
  const lowerTitle = title.toLowerCase();
  const notes = lowerTitle.includes("security")
    ? [
        "Encryption at rest is described in vendor-authored material.",
        "Independent key-management evidence is not included in this sample.",
        "No penetration-test report or remediation record is supplied.",
      ]
    : lowerTitle.includes("certificate")
      ? [
          "This fictional certificate-style record has no real issuing authority.",
          "Claimed scope and validity require independent verification.",
          "This sample is not a regulatory approval or certificate.",
        ]
      : lowerTitle.includes("api")
        ? [
            "HL7 v2 interface examples are described in vendor material.",
            "DICOM C-STORE support does not establish DICOMweb compatibility.",
            "FHIR resource coverage requires local conformance review.",
          ]
        : lowerTitle.includes("clinical")
          ? [
              "A workflow benefit is stated by the fictional vendor.",
              "No independent study protocol, population, or outcome report is supplied.",
              "The claim must not be treated as verified clinical evidence.",
            ]
          : lowerTitle.includes("service")
            ? [
                "Business-hours support is described.",
                "A 24/7 incident-response commitment is not established.",
                "Remedies and service credits require contract review.",
              ]
            : lowerTitle.includes("privacy")
              ? [
                  "Regional hosting options are mentioned.",
                  "Production and backup data regions are not identified.",
                  "No conclusion about data residency can be drawn from this sample.",
                ]
              : [
                  "This illustrative sample supports document-workflow testing only.",
                  "Claims require review against original, independently verifiable evidence.",
                ];
  const paragraphs = [
    title.toUpperCase(),
    "FICTIONAL DEMO DOCUMENT - NOT A REAL CERTIFICATION OR AUDIT",
    `Fictional organisation: ${vendor}`,
    `Fictional reference: ${ref}`,
    `Issue date: ${date}`,
    "",
    "PURPOSE AND SCOPE",
    `This ${title} is invented demonstration material. It is not real evidence, an approval, a certification, or a statement of deployment.`,
    "",
    "SCENARIO STATEMENTS",
    ...notes,
    "",
    "REVIEW LIMITATIONS",
    "All statements are fictional and unverified. No regulator, auditor, issuing authority, or real organisation is represented.",
    "A qualified human reviewer must assess original evidence, applicability, scope, dates, and contractual context.",
    "",
    "Fictional issuer: KYRO Demonstration Materials Unit",
    "No official approval number is assigned.",
  ];
  const wrap = (text: string) => {
    const words = text
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]/g, "-")
      .split(/\s+/);
    const output: string[] = [];
    let current = "";
    for (const word of words) {
      if (`${current} ${word}`.trim().length > 88 && current) {
        output.push(current);
        current = word;
      } else {
        current = `${current} ${word}`.trim();
      }
    }
    if (current) output.push(current);
    return output;
  };
  const lines = paragraphs.flatMap((paragraph) => (paragraph ? wrap(paragraph) : [""]));
  const pageLines = Array.from({ length: Math.ceil(lines.length / 34) }, (_, i) =>
    lines.slice(i * 34, (i + 1) * 34),
  );
  const objects: string[] = ["", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  const pageRefs: number[] = [];
  pageLines.forEach((pageLinesForPage, pageIndex) => {
    const pageObjectId = objects.length + 1;
    const contentObjectId = pageObjectId + 1;
    pageRefs.push(pageObjectId);
    const drawLines = pageLinesForPage
      .map((line, index) => {
        const escaped = line.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
        const fontSize =
          pageIndex === 0 && index === 0 ? 15 : pageIndex === 0 && index <= 3 ? 11 : 10;
        const y = 790 - index * 21;
        return `1 0 0 1 50 ${y} Tm\n/F1 ${fontSize} Tf\n(${escaped}) Tj`;
      })
      .join("\n");
    const stream = `BT\n${drawLines}\nET\nBT\n/F1 9 Tf\n510 24 Td\n(${pageIndex + 1} / ${pageLines.length}) Tj\nET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
      `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
    );
  });
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageRefs.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return { blob: new Blob([pdf], { type: "application/pdf" }), pages: pageLines.length };
}

async function createDemoZip(files: { name: string; blob: Blob }[]) {
  const encoder = new TextEncoder();
  const crc32 = (bytes: Uint8Array) => {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  const entries: { name: Uint8Array; data: Uint8Array; crc: number; offset: number }[] = [];
  const chunks: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const crc = crc32(data);
    const header = new Uint8Array(30 + name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, name.length, true);
    header.set(name, 30);
    entries.push({ name, data, crc, offset });
    chunks.push(header, data);
    offset += header.length + data.length;
  }
  const central = entries.map(({ name, data, crc, offset: localOffset }) => {
    const header = new Uint8Array(46 + name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, data.length, true);
    view.setUint32(24, data.length, true);
    view.setUint16(28, name.length, true);
    view.setUint32(42, localOffset, true);
    header.set(name, 46);
    return header;
  });
  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  central.forEach((chunk) => chunks.push(chunk));
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  chunks.push(end);
  const output = new Uint8Array(offset + centralSize + end.length);
  let cursor = 0;
  for (const chunk of chunks) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }
  return new Blob([output.buffer], { type: "application/zip" });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.style.display = "none";
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

const initialTranscript = [
  {
    agent: "Compliance Agent",
    kind: "observation",
    text: "The supplied residency statement discusses regional options, but it does not identify production or backup regions. Treat this as unresolved rather than noncompliant.",
  },
  {
    agent: "Security & Privacy Agent",
    kind: "evidence",
    text: "The security questionnaire describes encryption at rest. Independent evidence for key-management controls was not included in this fictional evidence pack.",
  },
  {
    agent: "Integration Fit Agent",
    kind: "observation",
    text: "HL7 v2 is referenced. DICOMweb support is not established by the supplied material; DICOM C-STORE would not establish DICOMweb compatibility.",
  },
  {
    agent: "Clinical Evidence Agent",
    kind: "challenge",
    text: "The stated workflow benefit appears in vendor-authored material. The supplied scenario does not independently establish the claimed outcome.",
  },
  {
    agent: "Operations Agent",
    kind: "evidence",
    text: "Business-hours support is described. A 24/7 incident-response commitment was not identified in the fictional service agreement record.",
  },
  {
    agent: "Skeptic Agent",
    kind: "resolution",
    text: "Keep the residency conclusion as unknown. Request region-specific architecture; do not convert missing evidence into a compliance failure.",
  },
];

export function KyroWorkspace() {
  const [state, setState] = useState<KyroState>(seedState);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("Overview");
  const [search, setSearch] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [activeInvestigation, setActiveInvestigation] = useState("KY-2026-041");
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<string | null>(null);
  const [showScoreMethod, setShowScoreMethod] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [documentPreviewDraft, setDocumentPreviewDraft] = useState("");
  const [pendingDeleteDocument, setPendingDeleteDocument] = useState<string | null>(null);
  const [modal, setModal] = useState<
    "vendor" | "wizard" | "security" | "reset" | "archive" | "cancel" | "delete-document" | null
  >(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [riskFilter, setRiskFilter] = useState("All risks");
  const [investigationFilter, setInvestigationFilter] = useState("All statuses");
  const [investigationVendorFilter, setInvestigationVendorFilter] = useState("All vendors");
  const [investigationDimensionFilter, setInvestigationDimensionFilter] =
    useState("All dimensions");
  const [investigationDateFilter, setInvestigationDateFilter] = useState("All dates");
  const [sortBy, setSortBy] = useState("name");
  const [vendorLayout, setVendorLayout] = useState<"table" | "cards">("table");
  const [documentFilter, setDocumentFilter] = useState("All documents");
  const [alertFilter, setAlertFilter] = useState("All alerts");
  const [findingFilter, setFindingFilter] = useState("All findings");
  const [detailTab, setDetailTab] = useState("Overview");
  const [activeAgent, setActiveAgent] = useState(agentRoster[0]?.id ?? "compliance");
  const [chatSearch, setChatSearch] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState(
    initialTranscript.map((item, index) => ({
      ...item,
      id: `chat-${index}`,
      at: `10:${String(14 + index * 3).padStart(2, "0")}`,
    })),
  );
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardVendor, setWizardVendor] = useState("v-cloudward");
  const [wizardProduct, setWizardProduct] = useState("CloudWard Care Platform");
  const [wizardDimensions, setWizardDimensions] = useState<Dimension[]>(dimensions);
  const [fileVendor, setFileVendor] = useState("v-cloudward");
  const [documentType, setDocumentType] = useState("Other");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadStage, setUploadStage] = useState("");
  const [monitoringBusy, setMonitoringBusy] = useState(false);
  const [monitoringVendor, setMonitoringVendor] = useState("v-cloudward");
  const [guidedStep, setGuidedStep] = useState<number | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [returnToWizard, setReturnToWizard] = useState(false);
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);
  const [selectedIntegrationVendor, setSelectedIntegrationVendor] = useState("v-cloudward");
  const [hospitalContext, setHospitalContext] = useState(
    "Asterion Medical Network · All hospitals",
  );
  const [vendorForm, setVendorForm] = useState({
    name: "",
    category: "Healthcare technology",
    product: "",
    summary: "",
  });
  const [reviewNote, setReviewNote] = useState("");

  useEffect(() => {
    setState(readSavedState());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) window.localStorage.setItem("kyro-demo-v1", JSON.stringify(state));
  }, [state, hydrated]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const running = state.investigations.find(
      (item) => item.id === activeInvestigation && item.status === "Running",
    );
    if (!running) return;
    const timer = window.setTimeout(() => {
      setState((current) => {
        const investigation = current.investigations.find(
          (item) => item.id === activeInvestigation,
        );
        if (!investigation || investigation.status !== "Running") return current;
        const progress = Math.min(100, investigation.progress + 8);
        const stage =
          stageNames[Math.min(stageNames.length - 1, Math.floor(progress / 15))] ??
          stageNames.at(-1) ??
          "Final assessment";
        const status: InvestigationStatus = progress === 100 ? "Completed" : "Running";
        const update = { ...investigation, progress, stage, status, updated: today() };
        const event: TimelineEvent = {
          id: createId("T"),
          at: new Date().toISOString(),
          type: progress === 100 ? "Investigation completed" : "Agent progress",
          description:
            progress === 100
              ? `Simulated review finished for ${current.vendors.find((vendor) => vendor.id === investigation.vendorId)?.name ?? "vendor"}.`
              : `${stage} progressed to ${progress}%.`,
          vendorId: investigation.vendorId,
          investigationId: investigation.id,
        };
        return {
          ...current,
          investigations: current.investigations.map((item) =>
            item.id === activeInvestigation ? update : item,
          ),
          timeline: [event, ...current.timeline],
        };
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [state.investigations, activeInvestigation]);

  const notify = (message: string) => setToast(message);
  const logEvent = (
    description: string,
    type: string,
    vendorId?: string,
    investigationId?: string,
  ) => {
    const event: TimelineEvent = {
      id: createId("T"),
      at: new Date().toISOString(),
      type,
      description,
      ...(vendorId ? { vendorId } : {}),
      ...(investigationId ? { investigationId } : {}),
    };
    setState((current) => ({ ...current, timeline: [event, ...current.timeline] }));
  };
  const selectView = (next: View) => {
    setView(next);
    setMobileNav(false);
    setNotificationOpen(false);
  };
  const currentInvestigation =
    state.investigations.find((item) => item.id === activeInvestigation) ?? state.investigations[0];
  const investigationVendor =
    state.vendors.find((item) => item.id === currentInvestigation?.vendorId) ?? state.vendors[0];
  const currentVendor = state.vendors.find((item) => item.id === selectedVendor) ?? null;
  const currentFinding = state.findings.find((item) => item.id === selectedFinding) ?? null;
  const currentDocument = state.documents.find((item) => item.id === selectedDocument) ?? null;
  useEffect(() => {
    if (currentDocument) setDocumentPreviewDraft(currentDocument.preview);
  }, [currentDocument]);
  const currentFindings = state.findings.filter(
    (finding) => finding.investigationId === activeInvestigation,
  );
  const assessment = calculateScore(
    currentFindings,
    currentInvestigation?.dimensions ?? dimensions,
    state.appetite,
  );
  const selectedIntegrationChecks = getIntegrationChecksForVendor(state, selectedIntegrationVendor);
  const unreadCount = state.notifications.filter((item) => !item.read).length;
  const liveSearch = search.trim().toLowerCase();
  const globalResults = liveSearch
    ? [
        ...state.vendors
          .filter((vendor) => vendor.name.toLowerCase().includes(liveSearch))
          .map((vendor) => ({
            label: vendor.name,
            type: "Vendor",
            action: () => {
              setSelectedVendor(vendor.id);
              selectView("Vendors");
            },
          })),
        ...state.investigations
          .filter((investigation) =>
            `${investigation.id} ${investigation.product}`.toLowerCase().includes(liveSearch),
          )
          .map((investigation) => ({
            label: `${investigation.id} · ${investigation.product}`,
            type: "Investigation",
            action: () => openInvestigation(investigation.id),
          })),
        ...state.documents
          .filter((doc) => doc.name.toLowerCase().includes(liveSearch))
          .map((doc) => ({
            label: doc.name,
            type: "Document",
            action: () => {
              setSelectedDocument(doc.id);
              selectView("Documents");
            },
          })),
      ].slice(0, 6)
    : [];

  function openInvestigation(id: string) {
    setActiveInvestigation(id);
    setDetailTab("Overview");
    selectView("Investigation detail");
  }
  function newInvestigationFor(vendorId: string) {
    setWizardVendor(vendorId);
    const vendor = state.vendors.find((item) => item.id === vendorId);
    setWizardProduct(vendor?.products[0] ?? "New product");
    setWizardStep(0);
    setWizardDimensions(state.reviewPreferences?.[0] === false ? [] : [...dimensions]);
    setHospitalContext("Asterion Medical Network · All hospitals");
    setModal("wizard");
  }
  function duplicateInvestigation(source: Investigation) {
    const nextNumber =
      Math.max(41, ...state.investigations.map((item) => Number(item.id.split("-").at(-1)) || 0)) +
      1;
    const id = `KY-2026-${String(nextNumber).padStart(3, "0")}`;
    const duplicate: Investigation = {
      ...source,
      id,
      status: "Draft",
      progress: 0,
      stage: "Ready to start",
      created: today(),
      updated: today(),
      dimensions: [...source.dimensions],
    };
    setState((current) => ({ ...current, investigations: [duplicate, ...current.investigations] }));
    logEvent(`Duplicated ${source.id} as ${id}.`, "Investigation duplicated", source.vendorId, id);
    notify(`Draft ${id} created.`);
  }
  function updateFinding(id: string, status: FindingStatus, note?: string) {
    const finding = state.findings.find((item) => item.id === id);
    if (!finding) return;
    setState((current) => ({
      ...current,
      findings: current.findings.map((item) => (item.id === id ? { ...item, status } : item)),
    }));
    const suffix = note ? ` Reviewer note: ${note}` : "";
    logEvent(
      `Finding ${id} marked ${status.toLowerCase()}.${suffix}`,
      "Finding reviewed",
      finding.vendorId,
      finding.investigationId,
    );
    setSelectedFinding(null);
    setReviewNote("");
    notify(`Finding marked ${status.toLowerCase()}.`);
  }
  function setInvestigationStatus(id: string, status: InvestigationStatus) {
    setState((current) => ({
      ...current,
      investigations: current.investigations.map((item) =>
        item.id === id ? { ...item, status, updated: today() } : item,
      ),
    }));
    const investigation = state.investigations.find((item) => item.id === id);
    logEvent(
      `Investigation ${id} ${status.toLowerCase()}.`,
      `Investigation ${status.toLowerCase()}`,
      investigation?.vendorId,
      id,
    );
    notify(`Investigation ${status.toLowerCase()}.`);
  }
  async function createInvestigation() {
    const vendor = state.vendors.find((item) => item.id === wizardVendor);
    if (!vendor) return;
    const nextNumber =
      Math.max(41, ...state.investigations.map((item) => Number(item.id.split("-").at(-1)) || 0)) +
      1;
    const id = `KY-2026-${String(nextNumber).padStart(3, "0")}`;
    const newItem: Investigation = {
      id,
      vendorId: vendor.id,
      product: wizardProduct || vendor.products[0] || "New product",
      status: "Running",
      progress: 0,
      stage: stageNames[0] ?? "Evidence collection",
      created: today(),
      updated: today(),
      dimensions: wizardDimensions,
      context: hospitalContext,
    };
    setState((current) => ({ ...current, investigations: [newItem, ...current.investigations] }));
    setActiveInvestigation(id);
    setModal(null);
    setView("Investigation detail");
    setDetailTab("Overview");
    logEvent(
      `Created local simulated investigation ${id} for ${vendor.name}.`,
      "Investigation created",
      vendor.id,
      id,
    );
    notify("Investigation started — this local simulation will progress over time.");
  }
  function finishInstantly() {
    if (!currentInvestigation) return;
    setState((current) => ({
      ...current,
      investigations: current.investigations.map((item) =>
        item.id === activeInvestigation
          ? {
              ...item,
              progress: 100,
              stage: "Final assessment",
              status: "Completed",
              updated: today(),
            }
          : item,
      ),
    }));
    logEvent(
      `Instantly completed the simulated investigation for ${investigationVendor?.name ?? "vendor"}.`,
      "Investigation completed",
      investigationVendor?.id,
      activeInvestigation,
    );
    notify("Simulated assessment completed instantly.");
  }
  function markNotification(id: string) {
    setState((current) => ({
      ...current,
      notifications: current.notifications.map((item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    }));
  }
  function launchGuidedDemo() {
    setGuidedStep(0);
    selectView("Overview");
  }
  function advanceGuided(next: number) {
    if (next < 0) {
      setGuidedStep(null);
      return;
    }
    if (next >= 8) {
      setGuidedStep(null);
      return;
    }
    setGuidedStep(next);
    const steps: View[] = [
      "Overview",
      "Vendors",
      "Documents",
      "Investigation detail",
      "Investigation detail",
      "Investigation detail",
      "Integration Fit",
      "Reports",
    ];
    if (next === 3 || next === 4 || next === 5) {
      setActiveInvestigation("KY-2026-041");
      setDetailTab(next === 3 ? "Overview" : next === 4 ? "Agents" : "Debate");
    }
    const destination = steps[next];
    if (destination) selectView(destination);
  }
  const unreadNotifications = state.notifications.filter((item) => !item.read);
  const alertRows = state.alerts.filter(
    (item) =>
      (alertFilter === "All alerts" ||
        (alertFilter === "Open" ? item.status === "Open" : item.severity === alertFilter)) &&
      (!liveSearch || `${item.type} ${item.description}`.toLowerCase().includes(liveSearch)),
  );
  const filteredDocuments = state.documents.filter(
    (doc) =>
      (documentFilter === "All documents" ||
        doc.status === documentFilter ||
        doc.type === documentFilter) &&
      (!liveSearch ||
        `${doc.name} ${state.vendors.find((vendor) => vendor.id === doc.vendorId)?.name ?? ""}`
          .toLowerCase()
          .includes(liveSearch)),
  );
  const filteredFindings = currentFindings.filter(
    (finding) =>
      (findingFilter === "All findings" ||
        finding.severity === findingFilter ||
        finding.status === findingFilter) &&
      (!liveSearch || `${finding.title} ${finding.dimension}`.toLowerCase().includes(liveSearch)),
  );
  const filteredVendors = state.vendors
    .filter((vendor) => {
      const risk = getVendorRisk(state, vendor.id).risk;
      const investigation = state.investigations.find((item) => item.vendorId === vendor.id);
      return (
        (includeArchived || !vendor.archived) &&
        (!vendorSearch ||
          `${vendor.name} ${vendor.category}`.toLowerCase().includes(vendorSearch.toLowerCase())) &&
        (categoryFilter === "All categories" || vendor.category === categoryFilter) &&
        (riskFilter === "All risks" || risk === riskFilter) &&
        (investigationFilter === "All statuses" || investigation?.status === investigationFilter)
      );
    })
    .sort((a, b) =>
      sortBy === "risk"
        ? ({ Critical: 0, High: 1, Moderate: 2, Low: 3 }[getVendorRisk(state, a.id).risk] ?? 4) -
          ({ Critical: 0, High: 1, Moderate: 2, Low: 3 }[getVendorRisk(state, b.id).risk] ?? 4)
        : sortBy === "score"
          ? getVendorRisk(state, b.id).score - getVendorRisk(state, a.id).score
          : sortBy === "updated"
            ? b.updated.localeCompare(a.updated)
            : a.name.localeCompare(b.name),
    );

  const toggleDimension = (dimension: Dimension) =>
    setWizardDimensions((current) =>
      current.includes(dimension)
        ? current.filter((item) => item !== dimension)
        : [...current, dimension],
    );
  const processFiles = async (files: File[]) => {
    if (!files.length) return;
    const allowed = /\.(pdf|docx?|txt|csv|png|jpe?g|webp)$/i;
    const accepted = files.filter((file) => allowed.test(file.name));
    if (!accepted.length) {
      notify("Choose PDF, DOCX, TXT, CSV, PNG, JPG, or WEBP files.");
      return;
    }
    const duplicateNames = accepted.filter((file) =>
      state.documents.some(
        (doc) => doc.name.toLowerCase() === file.name.toLowerCase() && doc.vendorId === fileVendor,
      ),
    );
    const freshFiles = accepted.filter((file) => !duplicateNames.includes(file));
    if (!freshFiles.length) {
      notify("These files are already in this vendor's local library.");
      return;
    }
    setUploadBusy(true);
    setUploadStage("Validating files…");
    const newDocs: DemoDocument[] = await Promise.all(
      freshFiles.map((file) => {
        const preview = `Simulated extraction only. File contents were not read or stored for ${file.name}.`;
        return {
          id: createId("D"),
          vendorId: fileVendor,
          name: file.name,
          type: documentType,
          uploaded: today(),
          documentDate: today(),
          status: "Processing",
          size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
          preview,
          simulated: true,
          mimeType: file.type || "application/octet-stream",
          ...(() => {
            const investigationId = state.investigations.find(
              (investigation) => investigation.vendorId === fileVendor,
            )?.id;
            return investigationId ? { investigationId } : {};
          })(),
        };
      }),
    );
    const processingStages = [
      "Preparing documents…",
      "Preparing a local file record…",
      "Leaving document contents untouched…",
      "Saving the selected document type…",
      "Linking the filename to the vendor…",
    ];
    for (const stage of processingStages) {
      setUploadStage(stage);
      await simulateOperation(null, 180);
    }
    setState((current) => ({
      ...current,
      documents: [
        ...newDocs.map((item) => ({ ...item, status: "Processed" as const })),
        ...current.documents,
      ],
    }));
    newDocs.forEach((doc) =>
      logEvent(
        `Added ${doc.name}; its contents were not read.`,
        "Local file record added",
        doc.vendorId,
      ),
    );
    setUploadBusy(false);
    setUploadStage("");
    notify(
      `${newDocs.length} file${newDocs.length === 1 ? "" : "s"} added; contents were not read or stored.`,
    );
  };
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void processFiles(files);
  };
  const deleteDocument = (id: string) => {
    const doc = state.documents.find((item) => item.id === id);
    if (!doc) return;
    setState((current) => ({
      ...current,
      documents: current.documents.filter((item) => item.id !== id),
    }));
    logEvent(`Removed ${doc.name} from the local demo library.`, "Document deleted", doc.vendorId);
    setPendingDeleteDocument(null);
    setModal(null);
    notify("Document removed from local demo library.");
  };
  const generateDemoDocument = (
    vendorId: string,
    documentTitle: string,
    documentType: string,
    fileStem: string,
  ) => {
    const vendor = state.vendors.find((item) => item.id === vendorId);
    if (!vendor) return;
    const ref = `DEMO-${vendor.id.toUpperCase().replaceAll("-", "")}-${String(state.documents.length + 1).padStart(3, "0")}`;
    const { blob, pages } = createDemoPdf(documentTitle, vendor.name, ref);
    downloadBlob(blob, `${fileStem}.pdf`);
    const doc: DemoDocument = {
      id: createId("D"),
      vendorId,
      name: `${fileStem}.pdf`,
      type: documentType,
      uploaded: today(),
      documentDate: today(),
      status: "Processed",
      size: `${Math.max(3, Math.round(blob.size / 1024))} KB`,
      pages,
      preview: `Generated fictional PDF ${ref}. The contents are illustrative demo text only.`,
      simulated: true,
    };
    setState((current) => ({ ...current, documents: [doc, ...current.documents] }));
    logEvent(
      `Generated fictional demo document ${fileStem}.pdf.`,
      "Demo document generated",
      vendorId,
    );
    notify("Fictional demo PDF downloaded and added to the local library.");
  };
  const generateDemoDocumentSet = async (vendorId: string) => {
    const vendor = state.vendors.find((item) => item.id === vendorId);
    if (!vendor) return;
    const documentSet = [
      ["Vendor Security Assessment", "Security Assessment", "security-assessment"],
      ["Regulatory Compliance Certificate", "Compliance Certificate", "compliance-certificate"],
      ["Product API Documentation", "API Documentation", "api-documentation"],
      ["Clinical Evidence Summary", "Clinical Study", "clinical-evidence"],
      ["Service Level Agreement", "SLA", "service-level-agreement"],
      ["Data Privacy and Residency Statement", "Privacy Policy", "privacy-residency"],
    ] as const;
    const createdDocs: DemoDocument[] = [];
    const zipFiles: { name: string; blob: Blob }[] = [];
    documentSet.forEach(([title, type, stem]) => {
      const fileStem = `${vendor.name.replaceAll(" ", "-")}-${stem}-demo`;
      const ref = `DEMO-${vendor.id.toUpperCase().replaceAll("-", "")}-${stem.toUpperCase()}`;
      const { blob, pages } = createDemoPdf(title, vendor.name, ref);
      zipFiles.push({ name: `${fileStem}.pdf`, blob });
      const existing = state.documents.find(
        (document) => document.vendorId === vendorId && document.name === `${fileStem}.pdf`,
      );
      if (!existing) {
        const doc: DemoDocument = {
          id: createId("D"),
          vendorId,
          name: `${fileStem}.pdf`,
          type,
          uploaded: today(),
          documentDate: today(),
          status: "Processed",
          size: `${Math.max(3, Math.round(blob.size / 1024))} KB`,
          pages,
          preview: `Fictional ${title.toLowerCase()} for ${vendor.name}; for demonstration only.`,
          simulated: true,
        };
        createdDocs.push(doc);
      }
    });
    const archive = await createDemoZip(zipFiles);
    downloadBlob(archive, `${vendor.name.replaceAll(" ", "-")}-six-fictional-demo-documents.zip`);
    if (createdDocs.length) {
      setState((current) => ({ ...current, documents: [...createdDocs, ...current.documents] }));
    }
    logEvent(
      `Generated six fictional demo PDFs for ${vendor.name}.`,
      "Demo document set generated",
      vendorId,
    );
    notify(
      `Downloaded a ZIP of six fictional PDFs; ${createdDocs.length} new records were added locally.`,
    );
  };
  const runMonitoring = async () => {
    if (monitoringBusy) return;
    setMonitoringBusy(true);
    notify("Running the local simulated monitoring checks…");
    await simulateOperation(null, 1400);
    const candidates = [
      {
        id: "AL-DEMO-RESIDENCY",
        type: "Residency evidence requires review",
        severity: "High" as Risk,
        description: "The scenario still does not identify production and backup data regions.",
      },
      {
        id: "AL-DEMO-SECURITY",
        type: "Security evidence gap",
        severity: "Moderate" as Risk,
        description: "Independent key-management evidence remains absent from the fictional pack.",
      },
    ];
    const added: DemoAlert[] = candidates
      .filter(
        (item) =>
          !state.alerts.some(
            (alert) => alert.id === item.id && alert.vendorId === monitoringVendor,
          ),
      )
      .map((item) => ({
        ...item,
        vendorId: monitoringVendor,
        detected: today(),
        status: "Open",
        reviewer: "Unassigned",
      }));
    setState((current) => ({ ...current, alerts: [...added, ...current.alerts] }));
    added.forEach((item) =>
      logEvent(
        `Local monitoring simulation created ${item.type.toLowerCase()} for ${state.vendors.find((vendor) => vendor.id === monitoringVendor)?.name ?? "vendor"}.`,
        "Monitoring alert created",
        monitoringVendor,
      ),
    );
    setMonitoringBusy(false);
    notify(
      added.length
        ? `${added.length} new simulated alert${added.length === 1 ? "" : "s"} added.`
        : "Monitoring checks complete. No duplicate alerts were created.",
    );
  };
  const startDebate = (finding: Finding) => {
    const newMessage = {
      id: createId("chat"),
      agent: "Skeptic Agent",
      kind: "challenge",
      at: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      text: `Challenge: “${finding.title}.” The current evidence class is ${finding.confidence < 60 ? "limited" : "moderate"}. Keep uncertainty visible and request: ${finding.nextStep}`,
    };
    setChatMessages((current) => [...current, newMessage]);
    setState((current) => ({
      ...current,
      findings: current.findings.map((item) =>
        item.id === finding.id ? { ...item, status: "Under review" } : item,
      ),
    }));
    logEvent(
      `Skeptic review challenged “${finding.title}”; status changed to under review.`,
      "Finding challenged",
      finding.vendorId,
      finding.investigationId,
    );
    setSelectedFinding(null);
    setDetailTab("Debate");
    notify("A hardcoded skeptic challenge was added to the discussion.");
  };
  const sendChat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatMessages((current) => [
      ...current,
      {
        id: createId("chat"),
        agent: "Hospital reviewer",
        kind: "instruction",
        at: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        text,
      },
      {
        id: createId("chat"),
        agent: "Local orchestrator simulation",
        kind: "resolution",
        at: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        text: "Instruction recorded locally. The prewritten review sequence now keeps this priority visible; no external AI or data source was contacted.",
      },
    ]);
    logEvent(
      `Reviewer instruction added to the local investigation: “${text}”`,
      "Reviewer instruction",
      investigationVendor?.id,
      activeInvestigation,
    );
    setChatInput("");
    notify("Instruction added to the local investigation timeline.");
  };
  const changeIntegration = (
    id: string,
    status: IntegrationCheck["status"],
    vendorId = selectedIntegrationVendor,
  ) => {
    setState((current) => {
      const updated = getIntegrationChecksForVendor(current, vendorId).map((item) =>
        item.id === id ? { ...item, status } : item,
      );
      return {
        ...current,
        integrationByVendor: {
          ...current.integrationByVendor,
          [vendorId]: updated,
        },
        ...(vendorId === "v-cloudward" ? { integration: updated } : {}),
      };
    });
    logEvent(
      `Updated integration requirement ${id} to ${status}.`,
      "Integration requirement changed",
      vendorId,
      activeInvestigation,
    );
    notify("Integration assessment updated locally.");
  };
  const resetDemo = () => {
    window.localStorage.removeItem("kyro-demo-v1");
    setModal(null);
    setActiveInvestigation("KY-2026-041");
    setSelectedVendor(null);
    setSelectedFinding(null);
    setSelectedDocument(null);
    setView("Overview");
    setState((current) => ({
      ...structuredClone(seedState),
      timeline: [
        {
          id: createId("T"),
          at: new Date().toISOString(),
          type: "Demo data reset",
          description: "Restored the deterministic fictional seed scenario.",
        },
        ...seedState.timeline.slice(0, 49),
      ],
    }));
    notify("Seeded demo data restored.");
  };

  function renderOverview() {
    const assessed = state.vendors.filter((vendor) =>
      state.investigations.some((item) => item.vendorId === vendor.id),
    ).length;
    const highRisk = state.vendors.filter((vendor) =>
      ["High", "Critical"].includes(getVendorRisk(state, vendor.id).risk),
    ).length;
    const openCritical = state.findings.filter(
      (item) => item.severity === "Critical" && !["Resolved", "Rejected"].includes(item.status),
    ).length;
    const expiring = state.documents.filter(
      (item) => item.status === "Expiring" || item.status === "Expired",
    ).length;
    const pending = state.findings.filter((item) => item.status === "Under review").length;
    const riskBuckets = (["Low", "Moderate", "High", "Critical"] as Risk[]).map((risk) => ({
      risk,
      count: state.vendors.filter((vendor) => getVendorRisk(state, vendor.id).risk === risk).length,
    }));
    const dimensionsScore = dimensions.map((dimension) => {
      const findings = state.findings.filter((finding) => finding.dimension === dimension);
      const penalty = findings.reduce(
        (total, finding) =>
          total +
          severityPenalties[finding.severity] *
            (finding.status === "Under review"
              ? 0.75
              : finding.status === "Accepted risk"
                ? 0.5
                : ["Resolved", "Rejected"].includes(finding.status)
                  ? 0
                  : 1),
        0,
      );
      return { dimension, value: Math.round(penalty / Math.max(1, findings.length)) };
    });
    return (
      <>
        <div className="kyro-page-title-row">
          <div>
            <div className="kyro-eyebrow">
              Asterion Medical Network <span>·</span> Vendor intelligence
            </div>
            <h1>Good morning</h1>
            <p>A clear view of your vendor landscape.</p>
          </div>
          <div className="kyro-title-actions">
            <StatusBadge tone="demo">Demo data</StatusBadge>
            <Button onClick={launchGuidedDemo} variant="outline">
              <Play size={15} /> Launch guided demo
            </Button>
            <Button onClick={() => newInvestigationFor("v-cloudward")}>
              <Plus size={16} /> New investigation
            </Button>
          </div>
        </div>
        <div className="kyro-metrics-grid">
          <Metric
            label="Vendors assessed"
            value={`${assessed} / ${state.vendors.length}`}
            note="View vendor directory"
            icon={Building2}
            onClick={() => selectView("Vendors")}
          />
          <Metric
            label="Active investigations"
            value={
              state.investigations.filter((item) =>
                ["Running", "Queued", "Paused"].includes(item.status),
              ).length
            }
            note="Open investigations"
            icon={Search}
            tone="teal"
            onClick={() => selectView("Investigations")}
          />
          <Metric
            label="High-risk vendors"
            value={highRisk}
            note="Review risk profile"
            icon={ShieldAlert}
            tone="amber"
            onClick={() => {
              setRiskFilter("High");
              selectView("Vendors");
            }}
          />
          <Metric
            label="Open critical findings"
            value={openCritical}
            note="Review findings"
            icon={AlertCircle}
            tone="red"
            onClick={() => {
              const critical = state.findings.find(
                (finding) =>
                  finding.severity === "Critical" &&
                  !["Resolved", "Rejected"].includes(finding.status),
              );
              if (critical) {
                openInvestigation(critical.investigationId);
                setDetailTab("Findings");
              } else {
                setFindingFilter("Critical");
                selectView("Investigations");
              }
            }}
          />
          <Metric
            label="Expiring documents"
            value={expiring}
            note="Check document library"
            icon={Clock3}
            tone="amber"
            onClick={() => selectView("Documents")}
          />
          <Metric
            label="Pending reviews"
            value={pending}
            note="Review open decisions"
            icon={ClipboardList}
            tone="blue"
            onClick={() => {
              const reviewItem = state.findings.find(
                (finding) => finding.status === "Under review",
              );
              if (reviewItem) {
                setFindingFilter("Under review");
                openInvestigation(reviewItem.investigationId);
                setDetailTab("Findings");
              } else {
                setFindingFilter("Under review");
                selectView("Investigations");
              }
            }}
          />
        </div>
        <div className="kyro-overview-grid">
          <Panel
            title="Vendor risk overview"
            eyebrow="Current landscape"
            action={
              <Button variant="ghost" size="sm" onClick={() => selectView("Vendors")}>
                All vendors <ArrowRight size={14} />
              </Button>
            }
          >
            <div className="kyro-risk-chart">
              <div className="kyro-donut-wrap">
                <div className="kyro-donut">
                  <div>
                    <strong>{state.vendors.length}</strong>
                    <span>vendors</span>
                  </div>
                </div>
              </div>
              <div className="kyro-chart-legend">
                {riskBuckets.map(({ risk, count }) => (
                  <button
                    key={risk}
                    onClick={() => {
                      setRiskFilter(risk);
                      selectView("Vendors");
                    }}
                  >
                    <span className={`legend-dot ${getRiskClass(risk)}`} />
                    <span>{risk}</span>
                    <strong>{count}</strong>
                  </button>
                ))}
              </div>
            </div>
          </Panel>
          <Panel title="Risk by dimension" eyebrow="Evidence gaps · illustrative">
            <div className="kyro-bar-chart">
              {dimensionsScore.map(({ dimension, value }) => (
                <div className="kyro-bar-row" key={dimension}>
                  <span>{dimensionShort[dimension]}</span>
                  <div className="kyro-bar-track">
                    <i style={{ width: `${Math.max(8, value)}%` }} />
                  </div>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="kyro-chart-caption">
              <CircleHelp size={14} /> Bars show average evidence-gap signal, not a compliance
              verdict.
            </div>
          </Panel>
        </div>
        <div className="kyro-overview-grid overview-lower">
          <Panel
            title="Recent investigations"
            eyebrow="Latest activity"
            action={
              <Button variant="ghost" size="sm" onClick={() => selectView("Investigations")}>
                View all <ArrowRight size={14} />
              </Button>
            }
          >
            <div className="kyro-table-wrap">
              <table className="kyro-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Investigation</th>
                    <th>Status</th>
                    <th>Risk</th>
                    <th>Score</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {state.investigations.slice(0, 4).map((item) => {
                    const vendor = state.vendors.find((entry) => entry.id === item.vendorId);
                    const score = getVendorRisk(state, item.vendorId);
                    return (
                      <tr key={item.id}>
                        <td>
                          <button
                            className="table-primary"
                            onClick={() => {
                              setSelectedVendor(item.vendorId);
                              selectView("Vendors");
                            }}
                          >
                            {vendor?.name}
                          </button>
                          <small>{item.product}</small>
                        </td>
                        <td className="table-mono">{item.id}</td>
                        <td>
                          <StatusBadge tone={item.status.toLowerCase()}>{item.status}</StatusBadge>
                        </td>
                        <td>
                          <RiskBadge risk={score.risk} />
                        </td>
                        <td>
                          <strong>{score.score}</strong>
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Open ${item.id}`}
                            onClick={() => openInvestigation(item.id)}
                          >
                            <ChevronRight />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel
            title="Critical review queue"
            eyebrow="Evidence requiring attention"
            action={
              <Button variant="ghost" size="sm" onClick={() => openInvestigation("KY-2026-041")}>
                Open workspace <ArrowRight size={14} />
              </Button>
            }
          >
            <div className="kyro-review-list">
              {state.findings
                .filter(
                  (finding) =>
                    ["High", "Critical"].includes(finding.severity) &&
                    !["Resolved", "Rejected"].includes(finding.status),
                )
                .slice(0, 4)
                .map((finding) => (
                  <button
                    className="kyro-review-item"
                    key={finding.id}
                    onClick={() => {
                      setSelectedFinding(finding.id);
                      openInvestigation(finding.investigationId);
                    }}
                  >
                    <span className={`review-severity ${getRiskClass(finding.severity)}`}>
                      <AlertTriangle size={16} />
                    </span>
                    <span>
                      <strong>{finding.title}</strong>
                      <small>
                        {state.vendors.find((vendor) => vendor.id === finding.vendorId)?.name} ·{" "}
                        {finding.dimension}
                      </small>
                    </span>
                    <span className="confidence-mini">
                      {finding.confidence}%<small>confidence</small>
                    </span>
                  </button>
                ))}
            </div>
          </Panel>
        </div>
        <div className="kyro-overview-grid overview-lower">
          <Panel
            title="Recent activity"
            eyebrow="Audit history"
            action={
              <Button variant="ghost" size="sm" onClick={() => selectView("Timeline")}>
                Full timeline <ArrowRight size={14} />
              </Button>
            }
          >
            <div className="kyro-activity-list">
              {state.timeline.slice(0, 5).map((event) => (
                <div className="kyro-activity-item" key={event.id}>
                  <span className="activity-marker">
                    <Check size={13} />
                  </span>
                  <span>
                    <strong>{event.description}</strong>
                    <small>
                      {event.type} ·{" "}
                      {state.vendors.find((vendor) => vendor.id === event.vendorId)?.name ??
                        "Asterion workspace"}
                    </small>
                  </span>
                  <time>{event.at.includes("T") ? event.at.slice(11, 16) : "Now"}</time>
                </div>
              ))}
            </div>
          </Panel>
          <Panel
            title="Monitoring alerts"
            eyebrow="Requires review"
            action={
              <Button variant="ghost" size="sm" onClick={() => selectView("Risk Monitoring")}>
                Open monitoring <ArrowRight size={14} />
              </Button>
            }
          >
            <div className="kyro-alert-list">
              {state.alerts
                .filter((item) => item.status === "Open")
                .slice(0, 4)
                .map((item) => (
                  <button
                    className="kyro-alert-item"
                    key={item.id}
                    onClick={() => selectView("Risk Monitoring")}
                  >
                    <span className={`review-severity ${getRiskClass(item.severity)}`}>
                      <AlertTriangle size={15} />
                    </span>
                    <span>
                      <strong>{item.type}</strong>
                      <small>
                        {state.vendors.find((vendor) => vendor.id === item.vendorId)?.name} ·{" "}
                        {formatDate(item.detected)}
                      </small>
                    </span>
                    <RiskBadge risk={item.severity} />
                  </button>
                ))}
            </div>
          </Panel>
        </div>
        <div className="kyro-principle-note">
          <ShieldCheck size={16} />
          <span>
            <strong>Decision support, not a certification.</strong> Risk severity and evidence
            confidence are separate; unknown evidence is not treated as proof of noncompliance.
            Final decisions stay with authorised human reviewers.
          </span>
        </div>
      </>
    );
  }

  function renderVendors() {
    return (
      <>
        <div className="kyro-page-title-row">
          <div>
            <div className="kyro-eyebrow">Directory / Fictional scenario</div>
            <h1>Vendors</h1>
            <p>Review vendor profiles, evidence coverage, and investigation status.</p>
          </div>
          <Button
            onClick={() => {
              setEditingVendorId(null);
              setVendorForm({
                name: "",
                category: "Healthcare technology",
                product: "",
                summary: "",
              });
              setModal("vendor");
            }}
          >
            <Plus size={16} /> Add vendor
          </Button>
        </div>
        <label className="archive-filter">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />
          Include archived vendors
        </label>
        {currentVendor && (
          <Panel
            title={currentVendor.name}
            eyebrow="Vendor profile · Fictional demo record"
            action={
              <>
                <Button variant="outline" onClick={() => newInvestigationFor(currentVendor.id)}>
                  <Plus size={14} /> Investigate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingVendorId(currentVendor.id);
                    setVendorForm({
                      name: currentVendor.name,
                      category: currentVendor.category,
                      product: currentVendor.products.join(", "),
                      summary: currentVendor.summary,
                    });
                    setModal("vendor");
                  }}
                >
                  Edit profile
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPendingArchiveId(currentVendor.id);
                    setModal("archive");
                  }}
                >
                  {currentVendor.archived ? "Restore vendor" : "Archive vendor"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close vendor profile"
                  onClick={() => setSelectedVendor(null)}
                >
                  <X />
                </Button>
              </>
            }
          >
            <div className="kyro-vendor-profile">
              <div className="vendor-profile-lead">
                <span className="vendor-avatar large">{getInitials(currentVendor.name)}</span>
                <div>
                  <h3>{currentVendor.category}</h3>
                  <p>{currentVendor.summary}</p>
                  <div className="vendor-products">
                    {currentVendor.products.map((product) => (
                      <StatusBadge key={product}>{product}</StatusBadge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="vendor-profile-stats">
                <div>
                  <span>Decision-support score</span>
                  <strong>
                    {getVendorRisk(state, currentVendor.id).score}{" "}
                    <RiskBadge risk={getVendorRisk(state, currentVendor.id).risk} />
                  </strong>
                </div>
                <div>
                  <span>Evidence completeness</span>
                  <strong>{currentVendor.evidenceCompleteness}%</strong>
                </div>
                <div>
                  <span>Open findings</span>
                  <strong>
                    {
                      state.findings.filter(
                        (finding) =>
                          finding.vendorId === currentVendor.id &&
                          !["Resolved", "Rejected"].includes(finding.status),
                      ).length
                    }
                  </strong>
                </div>
              </div>
              <div className="kyro-profile-findings">
                <h4>Assessment dimensions</h4>
                <div className="dimension-chips">
                  {dimensions.map((dimension) => (
                    <span key={dimension}>
                      {dimensionShort[dimension]}{" "}
                      <strong>
                        {getVendorRisk(state, currentVendor.id).dimensionScores[dimension]}
                      </strong>
                    </span>
                  ))}
                </div>
                <h4>Investigation history</h4>
                {state.investigations
                  .filter((item) => item.vendorId === currentVendor.id)
                  .map((item) => (
                    <button
                      className="investigation-history-row"
                      key={item.id}
                      onClick={() => openInvestigation(item.id)}
                    >
                      <span>
                        {item.id} · {item.product}
                      </span>
                      <StatusBadge tone={item.status.toLowerCase()}>{item.status}</StatusBadge>
                      <ArrowRight size={14} />
                    </button>
                  ))}
              </div>
            </div>
          </Panel>
        )}
        <div className="kyro-toolbar">
          <div className="kyro-filter-search">
            <Search size={16} />
            <Input
              aria-label="Search vendors"
              placeholder="Search vendors…"
              value={vendorSearch}
              onChange={(event) => setVendorSearch(event.target.value)}
            />
          </div>
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option>All categories</option>
            {Array.from(new Set(state.vendors.map((vendor) => vendor.category))).map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <select
            aria-label="Filter by risk"
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value)}
          >
            <option>All risks</option>
            {["Low", "Moderate", "High", "Critical"].map((risk) => (
              <option key={risk}>{risk}</option>
            ))}
          </select>
          <select
            aria-label="Filter by investigation status"
            value={investigationFilter}
            onChange={(event) => setInvestigationFilter(event.target.value)}
          >
            <option>All statuses</option>
            {["Draft", "Queued", "Running", "Paused", "Completed", "Failed", "Cancelled"].map(
              (status) => (
                <option key={status}>{status}</option>
              ),
            )}
          </select>
          <select
            aria-label="Sort vendors"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="name">Sort: name</option>
            <option value="risk">Sort: risk</option>
            <option value="score">Sort: score</option>
            <option value="updated">Sort: updated</option>
          </select>
          <div className="view-switch">
            <Button
              variant={vendorLayout === "table" ? "secondary" : "ghost"}
              size="icon"
              aria-label="Table view"
              onClick={() => setVendorLayout("table")}
            >
              <Table2 />
            </Button>
            <Button
              variant={vendorLayout === "cards" ? "secondary" : "ghost"}
              size="icon"
              aria-label="Card view"
              onClick={() => setVendorLayout("cards")}
            >
              <PanelLeftClose />
            </Button>
          </div>
        </div>
        {vendorLayout === "table" ? (
          <Panel title={`${filteredVendors.length} vendors`} eyebrow="Vendor register">
            <div className="kyro-table-wrap">
              <table className="kyro-table vendor-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th>Products</th>
                    <th>Risk level</th>
                    <th>Score</th>
                    <th>Evidence</th>
                    <th>Last assessed</th>
                    <th>Investigation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => {
                    const risk = getVendorRisk(state, vendor.id);
                    const investigation = state.investigations.find(
                      (item) => item.vendorId === vendor.id,
                    );
                    return (
                      <tr key={vendor.id}>
                        <td>
                          <button
                            className="vendor-cell"
                            onClick={() => setSelectedVendor(vendor.id)}
                          >
                            <span className="vendor-avatar">{getInitials(vendor.name)}</span>
                            <span>
                              <strong>{vendor.name}</strong>
                              <small>Fictional company</small>
                            </span>
                          </button>
                        </td>
                        <td>{vendor.category}</td>
                        <td>
                          {vendor.products.length} product{vendor.products.length > 1 ? "s" : ""}
                        </td>
                        <td>
                          <RiskBadge risk={risk.risk} />
                        </td>
                        <td>
                          <strong>{risk.score}</strong>
                        </td>
                        <td>
                          <span className="evidence-percent">{vendor.evidenceCompleteness}%</span>
                          <span className="table-progress">
                            <i style={{ width: `${vendor.evidenceCompleteness}%` }} />
                          </span>
                        </td>
                        <td>
                          {investigation ? formatDate(investigation.updated) : "Not assessed"}
                        </td>
                        <td>
                          {investigation ? (
                            <StatusBadge tone={investigation.status.toLowerCase()}>
                              {investigation.status}
                            </StatusBadge>
                          ) : (
                            <StatusBadge>Not started</StatusBadge>
                          )}
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedVendor(vendor.id)}
                          >
                            Profile
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${vendor.name}`}
                            onClick={() => {
                              setSelectedVendor(vendor.id);
                              setEditingVendorId(vendor.id);
                              setVendorForm({
                                name: vendor.name,
                                category: vendor.category,
                                product: vendor.products.join(", "),
                                summary: vendor.summary,
                              });
                              setModal("vendor");
                            }}
                          >
                            <Settings />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${vendor.archived ? "Restore" : "Archive"} ${vendor.name}`}
                            onClick={() => {
                              setPendingArchiveId(vendor.id);
                              setModal("archive");
                            }}
                          >
                            <X />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredVendors.length && (
                <div className="kyro-empty">
                  <Search />
                  <strong>No vendors match these filters</strong>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setVendorSearch("");
                      setCategoryFilter("All categories");
                      setRiskFilter("All risks");
                      setInvestigationFilter("All statuses");
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          </Panel>
        ) : (
          <div className="vendor-card-grid">
            {filteredVendors.map((vendor) => (
              <article className="vendor-card" key={vendor.id}>
                <header>
                  <span className="vendor-avatar">{getInitials(vendor.name)}</span>
                  <RiskBadge risk={getVendorRisk(state, vendor.id).risk} />
                </header>
                <h3>{vendor.name}</h3>
                <p>{vendor.category}</p>
                <span className="vendor-card-summary">{vendor.summary}</span>
                <div className="vendor-card-stats">
                  <span>
                    Score<strong>{getVendorRisk(state, vendor.id).score}</strong>
                  </span>
                  <span>
                    Evidence<strong>{vendor.evidenceCompleteness}%</strong>
                  </span>
                </div>
                <footer>
                  <Button variant="outline" onClick={() => setSelectedVendor(vendor.id)}>
                    Profile
                  </Button>
                  <Button onClick={() => newInvestigationFor(vendor.id)}>
                    <Plus size={14} /> Investigate
                  </Button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </>
    );
  }

  function renderInvestigations() {
    return (
      <>
        <div className="kyro-page-title-row">
          <div>
            <div className="kyro-eyebrow">Workspace / Assessments</div>
            <h1>Investigations</h1>
            <p>Track evidence-led vendor reviews across their full lifecycle.</p>
          </div>
          <Button onClick={() => newInvestigationFor("v-cloudward")}>
            <Plus size={16} /> New investigation
          </Button>
        </div>
        <div className="kyro-toolbar">
          <div className="kyro-filter-search">
            <Search size={16} />
            <Input
              aria-label="Search investigations"
              placeholder="Search vendor or ID…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            aria-label="Filter investigation status"
            value={investigationFilter}
            onChange={(event) => setInvestigationFilter(event.target.value)}
          >
            <option>All statuses</option>
            {["Draft", "Queued", "Running", "Paused", "Completed", "Failed", "Cancelled"].map(
              (status) => (
                <option key={status}>{status}</option>
              ),
            )}
          </select>
          <select
            aria-label="Filter investigations by vendor"
            value={investigationVendorFilter}
            onChange={(event) => setInvestigationVendorFilter(event.target.value)}
          >
            <option>All vendors</option>
            {state.vendors.map((vendor) => (
              <option value={vendor.id} key={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter investigations by dimension"
            value={investigationDimensionFilter}
            onChange={(event) => setInvestigationDimensionFilter(event.target.value)}
          >
            <option>All dimensions</option>
            {dimensions.map((dimension) => (
              <option key={dimension}>{dimension}</option>
            ))}
          </select>
          <select
            aria-label="Filter investigations by date"
            value={investigationDateFilter}
            onChange={(event) => setInvestigationDateFilter(event.target.value)}
          >
            <option>All dates</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
          <select
            aria-label="Filter investigation risk"
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value)}
          >
            <option>All risks</option>
            {["Low", "Moderate", "High", "Critical"].map((risk) => (
              <option key={risk}>{risk}</option>
            ))}
          </select>
        </div>
        <Panel
          title={`${state.investigations.length} investigations`}
          eyebrow="Assessment register"
        >
          <div className="kyro-table-wrap">
            <table className="kyro-table">
              <thead>
                <tr>
                  <th>ID / Vendor</th>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Current stage</th>
                  <th>Trust score</th>
                  <th>Risk</th>
                  <th>Progress</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.investigations
                  .filter(
                    (item) =>
                      (investigationFilter === "All statuses" ||
                        item.status === investigationFilter) &&
                      (riskFilter === "All risks" ||
                        calculateScore(
                          state.findings.filter((finding) => finding.investigationId === item.id),
                          item.dimensions,
                          state.appetite,
                        ).risk === riskFilter) &&
                      (investigationVendorFilter === "All vendors" ||
                        item.vendorId === investigationVendorFilter) &&
                      (investigationDimensionFilter === "All dimensions" ||
                        item.dimensions.includes(investigationDimensionFilter as Dimension)) &&
                      (investigationDateFilter === "All dates" ||
                        new Date(`${item.created}T00:00:00`).getTime() >=
                          Math.max(
                            ...state.investigations.map((record) =>
                              new Date(`${record.created}T00:00:00`).getTime(),
                            ),
                          ) -
                            (investigationDateFilter === "Last 30 days" ? 30 : 90) * 86400000) &&
                      (!search ||
                        `${item.id} ${item.product} ${state.vendors.find((vendor) => vendor.id === item.vendorId)?.name ?? ""}`
                          .toLowerCase()
                          .includes(search.toLowerCase())),
                  )
                  .map((item) => {
                    const vendor = state.vendors.find((entry) => entry.id === item.vendorId);
                    const risk = calculateScore(
                      state.findings.filter((finding) => finding.investigationId === item.id),
                      item.dimensions,
                      state.appetite,
                    );
                    return (
                      <tr key={item.id}>
                        <td>
                          <button
                            className="table-primary"
                            onClick={() => openInvestigation(item.id)}
                          >
                            {item.id}
                          </button>
                          <small>{vendor?.name}</small>
                        </td>
                        <td>{item.product}</td>
                        <td>
                          <StatusBadge tone={item.status.toLowerCase()}>{item.status}</StatusBadge>
                        </td>
                        <td>{item.stage}</td>
                        <td>
                          <strong>{risk.score}</strong>
                        </td>
                        <td>
                          <RiskBadge risk={risk.risk} />
                        </td>
                        <td>
                          <span className="table-progress wide">
                            <i style={{ width: `${item.progress}%` }} />
                          </span>
                          {item.progress}%
                        </td>
                        <td>{formatDate(item.updated)}</td>
                        <td>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openInvestigation(item.id)}
                          >
                            Open
                          </Button>
                          {["Draft", "Queued"].includes(item.status) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Start ${item.id}`}
                              onClick={() => setInvestigationStatus(item.id, "Running")}
                            >
                              <Play />
                            </Button>
                          )}
                          {item.status === "Running" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Pause ${item.id}`}
                              onClick={() => setInvestigationStatus(item.id, "Paused")}
                            >
                              <Square />
                            </Button>
                          )}
                          {item.status === "Paused" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Resume ${item.id}`}
                              onClick={() => setInvestigationStatus(item.id, "Running")}
                            >
                              <Play />
                            </Button>
                          )}
                          {!["Completed", "Cancelled"].includes(item.status) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Cancel ${item.id}`}
                              onClick={() => {
                                setPendingCancelId(item.id);
                                setModal("cancel");
                              }}
                            >
                              <X />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Duplicate ${item.id}`}
                            onClick={() => duplicateInvestigation(item)}
                          >
                            <Plus />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="kyro-principle-note">
          <Shield size={16} />
          <span>
            Workflows in this demonstration are deterministic local simulations. No vendor research
            or external AI service is contacted.
          </span>
        </div>
      </>
    );
  }

  function renderInvestigationDetail() {
    if (!currentInvestigation || !investigationVendor)
      return (
        <div className="kyro-empty">
          <Search />
          <strong>No investigation selected</strong>
          <Button onClick={() => selectView("Investigations")}>View investigations</Button>
        </div>
      );
    const tabNames = [
      "Overview",
      "Agents",
      "Evidence",
      "Findings",
      "Debate",
      "Integration",
      "Timeline",
    ];
    const agentForFinding = (finding: Finding) =>
      agentRoster.find((agent) => agent.dimension === finding.dimension) ?? agentRoster[0];
    const visibleMessages = chatMessages.filter(
      (message) =>
        (!chatSearch ||
          `${message.agent} ${message.text}`.toLowerCase().includes(chatSearch.toLowerCase())) &&
        (detailTab !== "Debate" || message.kind === "challenge" || message.kind === "resolution"),
    );
    return (
      <>
        <div className="kyro-breadcrumb">
          <button onClick={() => selectView("Investigations")}>Investigations</button>
          <ChevronRight size={14} />
          <span>{currentInvestigation.id}</span>
        </div>
        <div className="kyro-investigation-head">
          <div className="investigation-title">
            <span className="vendor-avatar large">{getInitials(investigationVendor.name)}</span>
            <div>
              <div className="kyro-eyebrow">
                {currentInvestigation.id} <span>·</span> {formatDate(currentInvestigation.updated)}
              </div>
              <h1>{investigationVendor.name}</h1>
              <p>
                {currentInvestigation.product} <span>·</span> {currentInvestigation.context}
              </p>
            </div>
          </div>
          <div className="investigation-head-actions">
            <StatusBadge tone={currentInvestigation.status.toLowerCase()}>
              {currentInvestigation.status}
            </StatusBadge>
            <RiskBadge risk={assessment.risk} />
            <strong className="head-score">
              {assessment.score}
              <small>/ 100</small>
            </strong>
            {currentInvestigation.status === "Running" ? (
              <Button
                variant="outline"
                onClick={() => setInvestigationStatus(currentInvestigation.id, "Paused")}
              >
                <Square size={14} /> Pause
              </Button>
            ) : currentInvestigation.status === "Paused" ? (
              <Button
                variant="outline"
                onClick={() => setInvestigationStatus(currentInvestigation.id, "Running")}
              >
                <Play size={14} /> Resume
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => exportInvestigation(currentInvestigation)}>
              <ArrowDownToLine size={14} /> Export
            </Button>
          </div>
        </div>
        <div className="kyro-progress-wrap">
          <div className="kyro-progress-track">
            {stageNames.map((stage, index) => (
              <span
                key={stage}
                className={
                  currentInvestigation.progress >= ((index + 1) / stageNames.length) * 100
                    ? "complete"
                    : currentInvestigation.progress > (index / stageNames.length) * 100
                      ? "active"
                      : ""
                }
              >
                <i>
                  {currentInvestigation.progress >= ((index + 1) / stageNames.length) * 100 ? (
                    <Check size={12} />
                  ) : (
                    index + 1
                  )}
                </i>
                <small>{stage}</small>
              </span>
            ))}
          </div>
          <div className="progress-control">
            <span>
              {currentInvestigation.progress}% · {currentInvestigation.stage}
            </span>
            {currentInvestigation.status !== "Completed" && (
              <Button variant="ghost" size="sm" onClick={finishInstantly}>
                <Sparkles size={14} /> Run demo instantly
              </Button>
            )}
          </div>
        </div>
        <div className="kyro-tabs" role="tablist">
          {tabNames.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={detailTab === tab}
              className={detailTab === tab ? "active" : ""}
              onClick={() => setDetailTab(tab)}
            >
              {tab}
              {tab === "Findings" && <span>{currentFindings.length}</span>}
            </button>
          ))}
        </div>
        {detailTab === "Overview" && (
          <>
            <div className="detail-score-grid">
              <div className="score-card">
                <div className="score-card-top">
                  <span>Decision-support score</span>
                  <button onClick={() => setShowScoreMethod(true)}>
                    How calculated <HelpCircle size={14} />
                  </button>
                </div>
                <strong className="large-score">
                  {assessment.score}
                  <small>/ 100</small>
                </strong>
                <RiskBadge risk={assessment.risk} />
                <p>Not a certification or procurement recommendation.</p>
                <div className="score-card-footer">
                  <span>Evidence confidence</span>
                  <strong>{assessment.confidence}%</strong>
                  <span>Missing-evidence signals</span>
                  <strong>{assessment.missingEvidence}</strong>
                </div>
              </div>
              <Panel title="Dimension scores" eyebrow="Severity-weighted, deterministic">
                <div className="kyro-dimension-bars">
                  {dimensions.map((dimension) => (
                    <div key={dimension}>
                      <span>{dimensionShort[dimension]}</span>
                      <div className="kyro-bar-track">
                        <i style={{ width: `${assessment.dimensionScores[dimension]}%` }} />
                      </div>
                      <strong>{assessment.dimensionScores[dimension]}</strong>
                    </div>
                  ))}
                </div>
                <div className="score-note">
                  <ShieldCheck size={14} /> An unresolved critical finding remains visible
                  regardless of the weighted average.
                </div>
              </Panel>
            </div>
            <div className="kyro-overview-grid overview-lower">
              <Panel title="Priority findings" eyebrow="Review queue">
                <div className="kyro-review-list">
                  {currentFindings.slice(0, 4).map((finding) => (
                    <button
                      className="kyro-review-item"
                      key={finding.id}
                      onClick={() => setSelectedFinding(finding.id)}
                    >
                      <span className={`review-severity ${getRiskClass(finding.severity)}`}>
                        <AlertTriangle size={16} />
                      </span>
                      <span>
                        <strong>{finding.title}</strong>
                        <small>
                          {finding.dimension} · {finding.status}
                        </small>
                      </span>
                      <span className="confidence-mini">
                        {finding.confidence}%<small>confidence</small>
                      </span>
                    </button>
                  ))}
                </div>
              </Panel>
              <Panel title="Recommended next steps" eyebrow="Human review">
                <ol className="next-step-list">
                  {currentFindings
                    .filter((finding) => !["Resolved", "Rejected"].includes(finding.status))
                    .slice(0, 3)
                    .map((finding) => (
                      <li key={finding.id}>
                        <span>{finding.nextStep}</span>
                        <button
                          onClick={() => setSelectedFinding(finding.id)}
                          aria-label={`Review ${finding.title}`}
                        >
                          <ArrowRight size={15} />
                        </button>
                      </li>
                    ))}
                </ol>
              </Panel>
            </div>
          </>
        )}
        {detailTab === "Agents" && (
          <div className="agents-workspace">
            <aside className="agent-list">
              <div className="agent-list-head">
                <h2>Investigation team</h2>
                <StatusBadge tone="demo">Simulated</StatusBadge>
              </div>
              {agentRoster.map((agent, index) => (
                <button
                  className={`agent-list-row ${activeAgent === agent.id ? "active" : ""}`}
                  key={agent.id}
                  onClick={() => setActiveAgent(agent.id)}
                >
                  <span className={`agent-avatar avatar-${index}`}>{agent.initials}</span>
                  <span>
                    <strong>{agent.name}</strong>
                    <small>{agent.task}</small>
                  </span>
                  <StatusBadge
                    tone={
                      currentInvestigation.status === "Completed"
                        ? "completed"
                        : index < Math.max(1, Math.ceil(currentInvestigation.progress / 15))
                          ? "running"
                          : "queued"
                    }
                  >
                    {currentInvestigation.status === "Completed"
                      ? "Completed"
                      : index < Math.max(1, Math.ceil(currentInvestigation.progress / 15))
                        ? "Reviewing"
                        : "Queued"}
                  </StatusBadge>
                </button>
              ))}
            </aside>
            <section className="agent-conversation">
              <header>
                <div>
                  <h2>Specialist activity</h2>
                  <p>Prewritten scenario observations · local simulation</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setChatMessages(
                      initialTranscript.map((item, index) => ({
                        ...item,
                        id: `chat-${index}`,
                        at: `10:${String(14 + index * 3).padStart(2, "0")}`,
                      })),
                    )
                  }
                >
                  <RefreshCw size={14} /> Replay sequence
                </Button>
              </header>
              <div className="chat-search">
                <Search size={15} />
                <Input
                  aria-label="Search agent conversation"
                  placeholder="Search conversation…"
                  value={chatSearch}
                  onChange={(event) => setChatSearch(event.target.value)}
                />
              </div>
              <div className="chat-messages">
                {visibleMessages.map((message) => (
                  <article className={`chat-message ${message.kind}`} key={message.id}>
                    <span className="chat-agent-icon">
                      <MessageSquare size={15} />
                    </span>
                    <div className="chat-message-body">
                      <header>
                        <strong>{message.agent}</strong>
                        <StatusBadge tone={message.kind}>{message.kind}</StatusBadge>
                        <time>{message.at}</time>
                      </header>
                      <p>{message.text}</p>
                      {message.kind === "evidence" && (
                        <button
                          className="citation-link"
                          onClick={() => {
                            setSelectedDocument(
                              state.documents.find((doc) => doc.vendorId === investigationVendor.id)
                                ?.id ?? null,
                            );
                            selectView("Documents");
                          }}
                        >
                          View evidence citation <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
                {!visibleMessages.length && (
                  <div className="kyro-empty compact">No messages match this search.</div>
                )}
              </div>
              <form className="chat-compose" onSubmit={sendChat}>
                <Input
                  aria-label="Add investigation instruction"
                  placeholder="Add a reviewer instruction…"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                />
                <Button type="submit" disabled={!chatInput.trim()}>
                  <Send size={15} /> Send
                </Button>
              </form>
              <p className="simulated-note">
                Messages and acknowledgements are hardcoded local simulations; no external AI
                service was contacted.
              </p>
            </section>
          </div>
        )}
        {detailTab === "Evidence" && (
          <Panel
            title="Evidence register"
            eyebrow="Linked demo records"
            action={
              <Button variant="outline" onClick={() => selectView("Documents")}>
                <FileText size={14} /> Document library
              </Button>
            }
          >
            <div className="kyro-table-wrap">
              <table className="kyro-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Source origin</th>
                    <th>Date</th>
                    <th>Extraction</th>
                    <th>Verification</th>
                    <th>Linked findings</th>
                  </tr>
                </thead>
                <tbody>
                  {state.documents
                    .filter((doc) => doc.vendorId === investigationVendor.id)
                    .map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <button
                            className="document-link"
                            onClick={() => setSelectedDocument(doc.id)}
                          >
                            <FileText size={16} />
                            {doc.name}
                          </button>
                        </td>
                        <td>
                          <StatusBadge tone="demo">Vendor-stated</StatusBadge>
                        </td>
                        <td>{formatDate(doc.documentDate)}</td>
                        <td>
                          <StatusBadge tone="processed">{doc.status}</StatusBadge>
                        </td>
                        <td>
                          <StatusBadge tone="review">Not independently verified</StatusBadge>
                        </td>
                        <td>
                          {currentFindings.filter((finding) => finding.source === doc.name)
                            .length || "Scenario linked"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="kyro-chart-caption">
              <ShieldCheck size={14} /> All vendor source records are fictional. A vendor claim is
              not an independently verified fact.
            </div>
          </Panel>
        )}
        {detailTab === "Findings" && (
          <Panel
            title="Findings register"
            eyebrow="Current investigation"
            action={
              <select
                aria-label="Filter findings"
                value={findingFilter}
                onChange={(event) => setFindingFilter(event.target.value)}
              >
                <option>All findings</option>
                {[
                  "Critical",
                  "High",
                  "Medium",
                  "Moderate",
                  "Low",
                  "Informational",
                  "Open",
                  "Under review",
                  "Accepted risk",
                  "Resolved",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            }
          >
            <div className="kyro-table-wrap">
              <table className="kyro-table">
                <thead>
                  <tr>
                    <th>Finding</th>
                    <th>Dimension</th>
                    <th>Severity</th>
                    <th>Confidence</th>
                    <th>Status</th>
                    <th>Evidence</th>
                    <th>Assigned reviewer</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredFindings.map((finding) => (
                    <tr key={finding.id}>
                      <td>
                        <button
                          className="table-primary"
                          onClick={() => setSelectedFinding(finding.id)}
                        >
                          {finding.title}
                        </button>
                        <small>{finding.id}</small>
                      </td>
                      <td>{finding.dimension}</td>
                      <td>
                        <RiskBadge risk={finding.severity} />
                      </td>
                      <td>
                        <span className="confidence-number">{finding.confidence}%</span>
                        <span className="confidence-track">
                          <i style={{ width: `${finding.confidence}%` }} />
                        </span>
                      </td>
                      <td>
                        <StatusBadge tone={finding.status.toLowerCase().replaceAll(" ", "-")}>
                          {finding.status}
                        </StatusBadge>
                      </td>
                      <td>{finding.source}</td>
                      <td>Review team</td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFinding(finding.id)}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredFindings.length && (
                <div className="kyro-empty">No findings match this filter.</div>
              )}
            </div>
          </Panel>
        )}
        {detailTab === "Debate" && (
          <div className="debate-workspace">
            <Panel
              title="Skeptic review"
              eyebrow="Structured evidence challenge"
              action={<StatusBadge tone="demo">Hardcoded scenario</StatusBadge>}
            >
              <div className="debate-sequence">
                <div className="debate-topic">
                  <span className="kyro-eyebrow">Debate topic</span>
                  <h3>Does the residency evidence support the initial conclusion?</h3>
                  <p>Participants · Compliance Agent · Skeptic Agent · Human reviewer</p>
                </div>
                {[
                  {
                    label: "Claim",
                    agent: "Compliance Agent",
                    text: "The vendor describes regional hosting options in a privacy statement.",
                  },
                  {
                    label: "Challenge",
                    agent: "Skeptic Agent",
                    text: "The supplied statement does not identify the production or backup data regions; this does not support a verified India-residency conclusion.",
                  },
                  {
                    label: "Rebuttal",
                    agent: "Compliance Agent",
                    text: "The document is vendor-provided. No independent verification result is available in this fictional demo.",
                  },
                  {
                    label: "Resolution",
                    agent: "Skeptic Agent",
                    text: "Keep residency status unknown. Request region-specific architecture; missing evidence is uncertainty, not proof of noncompliance.",
                  },
                ].map((step, index) => (
                  <div className={`debate-step debate-step-${index}`} key={step.label}>
                    <span className="debate-step-marker">{index + 1}</span>
                    <div>
                      <div className="kyro-eyebrow">{step.label}</div>
                      <strong>{step.agent}</strong>
                      <p>{step.text}</p>
                      {index < 2 && (
                        <button
                          className="citation-link"
                          onClick={() => {
                            setSelectedDocument(
                              state.documents.find((doc) => doc.vendorId === investigationVendor.id)
                                ?.id ?? null,
                            );
                            selectView("Documents");
                          }}
                        >
                          Fictional source citation <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="debate-resolution">
                <span>
                  <CheckCircle2 size={16} /> Resolution recorded in the local scenario
                </span>
                <Button
                  variant="outline"
                  onClick={() => {
                    const finding = currentFindings.find((item) =>
                      item.title.toLowerCase().includes("residency"),
                    );
                    if (finding) updateFinding(finding.id, "Under review");
                  }}
                >
                  Mark for human review
                </Button>
              </div>
            </Panel>
            <Panel title="Challenge a finding" eyebrow="Start a focused debate">
              <p className="panel-description">
                Choose a current finding to open a hardcoded challenge sequence using its actual
                title and review recommendation.
              </p>
              <div className="challenge-finding-list">
                {currentFindings.slice(0, 5).map((finding) => (
                  <div key={finding.id}>
                    <span>
                      <strong>{finding.title}</strong>
                      <small>
                        {finding.dimension} · {finding.status}
                      </small>
                    </span>
                    <Button variant="outline" onClick={() => startDebate(finding)}>
                      Challenge <GitBranch size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}
        {detailTab === "Integration" && (
          <IntegrationTable
            checks={getIntegrationChecksForVendor(state, investigationVendor.id)}
            onChange={(id, status) => changeIntegration(id, status, investigationVendor.id)}
            onRequirementChange={(id, requirement) => {
              setState((current) => {
                const checks = getIntegrationChecksForVendor(current, investigationVendor.id);
                const updated = updateIntegrationRequirement(checks, id, requirement);
                return {
                  ...current,
                  integrationByVendor: {
                    ...current.integrationByVendor,
                    [investigationVendor.id]: updated,
                  },
                  ...(investigationVendor.id === "v-cloudward" ? { integration: updated } : {}),
                };
              });
              logEvent(
                `Updated hospital requirement ${id} in the local scenario.`,
                "Hospital requirement changed",
                investigationVendor.id,
                currentInvestigation.id,
              );
            }}
          />
        )}
        {detailTab === "Timeline" && (
          <TimelinePanel
            events={state.timeline.filter(
              (event) =>
                event.investigationId === activeInvestigation ||
                event.vendorId === investigationVendor.id,
            )}
          />
        )}
      </>
    );
  }

  function exportInvestigation(investigation: Investigation) {
    const vendor = state.vendors.find((item) => item.id === investigation.vendorId);
    const findings = state.findings.filter((item) => item.investigationId === investigation.id);
    const result = {
      disclaimer: "Fictional local demo data; not a certification or verified assessment.",
      investigation,
      vendor,
      score: calculateScore(findings, investigation.dimensions, state.appetite),
      findings,
      documents: state.documents.filter((item) => item.vendorId === investigation.vendorId),
      integration: getIntegrationChecksForVendor(state, investigation.vendorId),
      generatedAt: new Date().toISOString(),
    };
    downloadBlob(
      new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }),
      `${investigation.id}-demo-report.json`,
    );
    logEvent(
      `Exported structured local report for ${investigation.id}.`,
      "Report exported",
      investigation.vendorId,
      investigation.id,
    );
    notify("Investigation report exported as JSON.");
  }

  function renderDocuments() {
    return (
      <>
        <div className="kyro-page-title-row">
          <div>
            <div className="kyro-eyebrow">Evidence / Local file library</div>
            <h1>Documents</h1>
            <p>Organise fictional records and inspect local or clearly simulated extraction.</p>
          </div>
          <Button
            onClick={() => {
              const vendor = state.vendors.find((item) => item.id === fileVendor);
              if (vendor) generateDemoDocumentSet(vendor.id);
            }}
          >
            <Sparkles size={15} /> Generate six demo PDFs
          </Button>
        </div>
        <div className="upload-toolbar">
          <label>
            Vendor
            <select
              aria-label="Select vendor for upload"
              value={fileVendor}
              onChange={(event) => setFileVendor(event.target.value)}
            >
              {state.vendors.map((vendor) => (
                <option value={vendor.id} key={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="outline"
            onClick={() =>
              generateDemoDocument(
                fileVendor,
                "Regulatory Compliance Certificate",
                "Compliance Certificate",
                `${state.vendors.find((item) => item.id === fileVendor)?.name.replaceAll(" ", "-") ?? "vendor"}-fictional-certificate-demo`,
              )
            }
          >
            <FileCheck2 size={15} /> Generate certificate PDF
          </Button>
          <label className={`upload-button ${uploadBusy ? "busy" : ""}`}>
            <input
              aria-label="Upload files"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.csv,.png,.jpg,.jpeg,.webp"
              onChange={handleUpload}
              disabled={uploadBusy}
            />
            <CloudUpload size={15} />
            {uploadBusy ? uploadStage : "Upload documents"}
          </label>
        </div>
        <label>
          Document type
          <select
            aria-label="Select uploaded document type"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
          >
            {[
              "Security Assessment",
              "Compliance Certificate",
              "Clinical Study",
              "API Documentation",
              "Architecture Diagram",
              "SLA",
              "Financial Disclosure",
              "Privacy Policy",
              "Penetration Test Report",
              "Other",
            ].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <div
          className="upload-dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void processFiles(Array.from(event.dataTransfer.files));
          }}
        >
          <CloudUpload size={21} />
          <span>
            <strong>Drop files to add them to the local library</strong>
            <small>
              PDF, DOCX, TXT, CSV, PNG, JPG, and WEBP · No file leaves this browser in this demo
            </small>
          </span>
          <label className="drop-select">
            Choose files
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.csv,.png,.jpg,.jpeg,.webp"
              onChange={handleUpload}
            />
          </label>
        </div>
        <Panel
          title="Document register"
          eyebrow={`${filteredDocuments.length} local records`}
          action={
            <select
              aria-label="Filter documents"
              value={documentFilter}
              onChange={(event) => setDocumentFilter(event.target.value)}
            >
              <option>All documents</option>
              {[
                "Processed",
                "Uploaded",
                "Processing",
                "Failed",
                "Expiring",
                "Expired",
                "Compliance Certificate",
                "Security Assessment",
                "API Documentation",
                "Clinical Study",
                "SLA",
                "Financial Disclosure",
                "Privacy Policy",
                "Penetration Test Report",
              ].map((filter) => (
                <option key={filter}>{filter}</option>
              ))}
            </select>
          }
        >
          <div className="kyro-table-wrap">
            <table className="kyro-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Vendor</th>
                  <th>Type</th>
                  <th>Uploaded</th>
                  <th>Document date</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Pages</th>
                  <th>Linked investigation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <button
                        className="document-link"
                        onClick={() => {
                          setSelectedDocument(doc.id);
                          setDocumentPreviewDraft(doc.preview);
                        }}
                      >
                        <FileText size={16} />
                        {doc.name}
                      </button>
                      <small>{doc.size}</small>
                    </td>
                    <td>{state.vendors.find((vendor) => vendor.id === doc.vendorId)?.name}</td>
                    <td>{doc.type}</td>
                    <td>{formatDate(doc.uploaded)}</td>
                    <td>{formatDate(doc.documentDate)}</td>
                    <td>{doc.expiry ? formatDate(doc.expiry) : "—"}</td>
                    <td>
                      <StatusBadge tone={doc.status.toLowerCase()}>{doc.status}</StatusBadge>
                    </td>
                    <td>{doc.pages ?? "—"}</td>
                    <td>
                      {doc.investigationId ? (
                        <button
                          className="table-primary"
                          onClick={() => openInvestigation(doc.investigationId ?? "")}
                        >
                          {doc.investigationId}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDocument(doc.id);
                          setDocumentPreviewDraft(doc.preview);
                        }}
                      >
                        Preview
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          setState((current) => ({
                            ...current,
                            documents: current.documents.map((item) =>
                              item.id === doc.id ? { ...item, status: "Processing" } : item,
                            ),
                          }));
                          await simulateOperation(null, 700);
                          setState((current) => ({
                            ...current,
                            documents: current.documents.map((item) =>
                              item.id === doc.id
                                ? {
                                    ...item,
                                    status: "Processed",
                                    preview: item.simulated
                                      ? `Simulated reprocessing only. ${item.preview}`
                                      : item.preview,
                                  }
                                : item,
                            ),
                          }));
                          logEvent(
                            `Reprocessed ${doc.name}; no unparsed file content was inferred.`,
                            "Document reprocessed",
                            doc.vendorId,
                          );
                          notify("Document reprocessed locally.");
                        }}
                      >
                        <RefreshCw size={13} /> Reprocess
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${doc.name}`}
                        onClick={() => {
                          setPendingDeleteDocument(doc.id);
                          setModal("delete-document");
                        }}
                      >
                        <X />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredDocuments.length && (
              <div className="kyro-empty">
                <FileText />
                <strong>No documents match these filters</strong>
              </div>
            )}
          </div>
        </Panel>
        <div className="kyro-principle-note">
          <AlertCircle size={16} />
          <span>
            Uploaded file contents are never read or stored; only the filename and selected document
            type are saved in this browser. Generated PDFs are downloadable fictional samples, not
            evidence or certifications.
          </span>
        </div>
      </>
    );
  }

  function renderIntegration() {
    const score = integrationReadiness(selectedIntegrationChecks);
    const integrationVendor = state.vendors.find(
      (vendor) => vendor.id === selectedIntegrationVendor,
    );
    return (
      <>
        <div className="kyro-page-title-row">
          <div>
            <div className="kyro-eyebrow">Compatibility / Asterion Medical Network</div>
            <h1>Integration fit</h1>
            <p>Compare vendor capabilities against the hospital's actual scenario requirements.</p>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv("asterion-integration-blueprint.csv", [
                ["Phase", "Owner", "Status", "Tasks"],
                [
                  "Discovery",
                  "Integration team",
                  "In progress",
                  "Confirm system inventory and interface scope",
                ],
                ["Interface build", "Technical team", "Planned", "Build and validate mappings"],
                ["Testing", "Clinical IT", "Planned", "Test representative workflows"],
                ["Go-live", "Programme lead", "Planned", "Approve readiness and support plan"],
              ])
            }
          >
            <ArrowDownToLine size={15} /> Export blueprint
          </Button>
        </div>
        <div className="integration-score-strip">
          <div className="integration-score">
            <span>Integration readiness</span>
            <strong>{score === null ? "Insufficient evidence" : `${score}%`}</strong>
            <small>
              {selectedIntegrationChecks.filter((item) => item.status === "Unknown").length} unknown
              requirements excluded from score denominator
            </small>
          </div>
          <div className="integration-counts">
            {(["Compatible", "Partial", "Incompatible", "Unknown"] as const).map((status) => (
              <span key={status}>
                <i className={`integration-dot ${status.toLowerCase()}`} />
                {status}
                <strong>
                  {selectedIntegrationChecks.filter((check) => check.status === status).length}
                </strong>
              </span>
            ))}
          </div>
          <label className="integration-vendor-select">
            Vendor scenario
            <select
              aria-label="Select vendor scenario"
              value={selectedIntegrationVendor}
              onChange={(event) => setSelectedIntegrationVendor(event.target.value)}
            >
              {state.vendors
                .filter((vendor) => !vendor.archived)
                .map((vendor) => (
                  <option value={vendor.id} key={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
            </select>
          </label>
          <StatusBadge tone="demo">
            Fictional {integrationVendor?.name ?? "vendor"} scenario
          </StatusBadge>
        </div>
        <IntegrationTable
          checks={selectedIntegrationChecks}
          onChange={changeIntegration}
          onRequirementChange={(id, requirement) => {
            setState((current) => {
              const checks = getIntegrationChecksForVendor(current, selectedIntegrationVendor);
              const updated = updateIntegrationRequirement(checks, id, requirement);
              return {
                ...current,
                integrationByVendor: {
                  ...current.integrationByVendor,
                  [selectedIntegrationVendor]: updated,
                },
                ...(selectedIntegrationVendor === "v-cloudward" ? { integration: updated } : {}),
              };
            });
            logEvent(
              `Updated hospital requirement ${id} in the local scenario.`,
              "Hospital requirement changed",
              selectedIntegrationVendor,
            );
          }}
        />
        <Panel title="Implementation blueprint" eyebrow="Illustrative phases">
          <div className="blueprint-phases">
            {[
              {
                name: "Discovery",
                owner: "Integration lead",
                duration: "2–4 weeks",
                tasks: [
                  "Confirm existing HIS, LIS, PACS, and identity-provider inventory",
                  "Agree data flows, interfaces, and accountable owners",
                ],
                risk: "Unclear data residency and endpoint scope",
              },
              {
                name: "Interface build",
                owner: "Technical team",
                duration: "4–8 weeks",
                tasks: [
                  "Map HL7 messages and FHIR resources",
                  "Configure authentication and audit-event handling",
                ],
                risk: "DICOMweb capability needs evidence",
              },
              {
                name: "Data migration",
                owner: "Data governance",
                duration: "3–6 weeks",
                tasks: [
                  "Define migration scope and data quality checks",
                  "Confirm retention and residency controls",
                ],
                risk: "Migration scope is not established",
              },
              {
                name: "Testing",
                owner: "Clinical IT",
                duration: "2–4 weeks",
                tasks: [
                  "Run interface conformance and workflow tests",
                  "Validate security and operational scenarios",
                ],
                risk: "No local conformance test results in this demo",
              },
              {
                name: "Go-live",
                owner: "Programme lead",
                duration: "1–2 weeks",
                tasks: [
                  "Complete readiness review and sign-offs",
                  "Confirm support and rollback coverage",
                ],
                risk: "Authorised human approval required",
              },
            ].map((phase, index) => (
              <details className="blueprint-phase" key={phase.name} open={index === 0}>
                <summary>
                  <span className="phase-number">0{index + 1}</span>
                  <span>
                    <strong>{phase.name}</strong>
                    <small>
                      {phase.owner} · {phase.duration}
                    </small>
                  </span>
                  <StatusBadge tone={index === 0 ? "review" : "neutral"}>
                    {index === 0 ? "In discovery" : "Planned"}
                  </StatusBadge>
                  <ChevronDown size={15} />
                </summary>
                <div className="blueprint-phase-content">
                  <strong>Tasks</strong>
                  {phase.tasks.map((task, taskIndex) => {
                    const taskKey = `${index}-${taskIndex}`;
                    const done = state.blueprintTasks.includes(taskKey);
                    return (
                      <label key={taskKey}>
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={(event) =>
                            setState((current) => ({
                              ...current,
                              blueprintTasks: event.target.checked
                                ? [...current.blueprintTasks, taskKey]
                                : current.blueprintTasks.filter((item) => item !== taskKey),
                            }))
                          }
                        />
                        {task}
                      </label>
                    );
                  })}
                  <p>
                    <AlertTriangle size={13} /> Risk to address: {phase.risk}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </Panel>
      </>
    );
  }

  function renderMonitoring() {
    return (
      <>
        <div className="kyro-page-title-row">
          <div>
            <div className="kyro-eyebrow">Continuous review / Local signals</div>
            <h1>Risk monitoring</h1>
            <p>Track changes and review attention flags in the fictional vendor landscape.</p>
          </div>
          <Button onClick={runMonitoring} disabled={monitoringBusy}>
            <RefreshCw size={15} className={monitoringBusy ? "spin" : ""} />
            {monitoringBusy ? "Checking…" : "Run demo monitoring"}
          </Button>
        </div>
        <div className="monitoring-run-note">
          <Activity size={17} />
          <span>
            <strong>Simulated monitoring only</strong>
            <small>
              No live vulnerability databases, vendor websites, or external sources are queried.
            </small>
          </span>
          <label>
            Vendor
            <select
              aria-label="Select monitoring vendor"
              value={monitoringVendor}
              onChange={(event) => setMonitoringVendor(event.target.value)}
            >
              {state.vendors.map((vendor) => (
                <option value={vendor.id} key={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="kyro-toolbar">
          <div className="kyro-filter-search">
            <Search size={16} />
            <Input
              aria-label="Search alerts"
              placeholder="Search alerts…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            aria-label="Filter alerts"
            value={alertFilter}
            onChange={(event) => setAlertFilter(event.target.value)}
          >
            <option>All alerts</option>
            <option>Open</option>
            {["Critical", "High", "Moderate", "Low"].map((risk) => (
              <option key={risk}>{risk}</option>
            ))}
          </select>
          <Button variant="outline" onClick={() => setAlertFilter("Open")}>
            <Filter size={14} /> Open only
          </Button>
        </div>
        <Panel title={`${alertRows.length} alerts`} eyebrow="Monitoring register">
          <div className="kyro-table-wrap">
            <table className="kyro-table">
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Vendor</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th>Detected</th>
                  <th>Reviewer</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alertRows.map((alert) => (
                  <tr key={alert.id}>
                    <td className="table-mono">{alert.id}</td>
                    <td>{state.vendors.find((vendor) => vendor.id === alert.vendorId)?.name}</td>
                    <td>{alert.type}</td>
                    <td>
                      <RiskBadge risk={alert.severity} />
                    </td>
                    <td className="table-description">
                      {alert.description}
                      {alert.note && <small>Note: {alert.note}</small>}
                    </td>
                    <td>{formatDate(alert.detected)}</td>
                    <td>
                      <select
                        aria-label={`Assign reviewer for ${alert.id}`}
                        value={alert.reviewer}
                        onChange={(event) =>
                          setState((current) => ({
                            ...current,
                            alerts: current.alerts.map((item) =>
                              item.id === alert.id
                                ? { ...item, reviewer: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      >
                        <option>Unassigned</option>
                        <option>Security review</option>
                        <option>Privacy review</option>
                        <option>Integration team</option>
                        <option>Clinical review</option>
                      </select>
                    </td>
                    <td>
                      <StatusBadge tone={alert.status.toLowerCase()}>{alert.status}</StatusBadge>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const status =
                            alert.status === "Resolved"
                              ? "Open"
                              : alert.status === "Open"
                                ? "Reviewed"
                                : "Resolved";
                          setState((current) => ({
                            ...current,
                            alerts: current.alerts.map((item) =>
                              item.id === alert.id ? { ...item, status } : item,
                            ),
                          }));
                          logEvent(
                            `Alert ${alert.id} marked ${status.toLowerCase()}.`,
                            `Alert ${status.toLowerCase()}`,
                            alert.vendorId,
                          );
                          notify(`Alert ${status.toLowerCase()}.`);
                        }}
                      >
                        {alert.status === "Open"
                          ? "Review"
                          : alert.status === "Reviewed"
                            ? "Resolve"
                            : "Reopen"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Add note to ${alert.id}`}
                        onClick={() => {
                          const note = window.prompt("Add a reviewer note to this local alert:");
                          if (note?.trim())
                            setState((current) => ({
                              ...current,
                              alerts: current.alerts.map((item) =>
                                item.id === alert.id ? { ...item, note: note.trim() } : item,
                              ),
                            }));
                        }}
                      >
                        <MessageSquare />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!alertRows.length && (
              <div className="kyro-empty">No monitoring alerts match your search.</div>
            )}
          </div>
        </Panel>
        <TimelinePanel
          events={state.timeline.filter(
            (item) =>
              item.type.toLowerCase().includes("monitor") ||
              item.type.toLowerCase().includes("alert"),
          )}
        />
      </>
    );
  }

  function renderReports() {
    const reports = [
      "Vendor Risk Assessment",
      "Executive Summary",
      "Evidence Register",
      "Integration Gap Analysis",
      "Investigation Timeline",
      "Monitoring Summary",
    ];
    const selected =
      state.investigations.find((item) => item.id === activeInvestigation) ??
      state.investigations[0];
    const selectedVendorRecord = state.vendors.find((item) => item.id === selected?.vendorId);
    const selectedFindings = selected
      ? state.findings.filter((item) => item.investigationId === selected.id)
      : [];
    const currentScore = calculateScore(
      selectedFindings,
      selected?.dimensions ?? dimensions,
      state.appetite,
    );
    const integration = selected ? getIntegrationChecksForVendor(state, selected.vendorId) : [];
    const reportHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Kyro local assessment</title><style>body{font:14px Arial,sans-serif;max-width:860px;margin:48px auto;color:#182536}h1{font-size:28px}h2{margin-top:30px;border-bottom:1px solid #dfe5eb;padding-bottom:8px}.notice{padding:14px;background:#f0f5f7;border:1px solid #dce5e9}table{width:100%;border-collapse:collapse}td,th{padding:9px;border-bottom:1px solid #e4e8eb;text-align:left}footer{margin-top:40px;color:#566273;font-size:12px}</style></head><body><p>KYRO · ASTERION MEDICAL NETWORK</p><h1>Vendor Risk Assessment</h1><p>${escapeHtml(selectedVendorRecord?.name ?? "Vendor")} · ${escapeHtml(selected?.product ?? "Product")} · ${escapeHtml(selected?.id ?? "")}</p><div class="notice">Fictional local demo data. This decision-support report is not certification, verified research, or a procurement decision.</div><h2>Assessment summary</h2><p>Score: ${currentScore.score}/100 · ${currentScore.risk} · Evidence confidence ${currentScore.confidence}%</p><h2>Findings</h2><table><tr><th>Finding</th><th>Dimension</th><th>Severity</th><th>Confidence</th><th>Status</th></tr>${selectedFindings.map((finding) => `<tr><td>${escapeHtml(finding.title)}</td><td>${escapeHtml(finding.dimension)}</td><td>${escapeHtml(finding.severity)}</td><td>${finding.confidence}%</td><td>${escapeHtml(finding.status)}</td></tr>`).join("")}</table><h2>Evidence gaps</h2><ul>${selectedFindings
      .filter(
        (finding) => finding.confidence < 60 && !["Resolved", "Rejected"].includes(finding.status),
      )
      .map((finding) => `<li>${escapeHtml(finding.nextStep)}</li>`)
      .join("")}</ul><h2>Integration gaps</h2><ul>${integration
      .filter((check) => check.status === "Unknown" || check.status === "Incompatible")
      .map((check) => `<li>${escapeHtml(check.requirement)}: ${escapeHtml(check.gap)}</li>`)
      .join(
        "",
      )}</ul><h2>Reviewer notes</h2><p>Human review is required before any procurement decision.</p><footer>Generated ${new Date().toLocaleString("en-IN")} · Fictional scenario records only.</footer></body></html>`;
    const reportBlob = new Blob([reportHtml], { type: "text/html" });
    return (
      <>
        <div className="kyro-page-title-row">
          <div>
            <div className="kyro-eyebrow">Exports / Leadership-ready</div>
            <h1>Reports</h1>
            <p>Generate current-state reports from the local fictional scenario.</p>
          </div>
          <select
            aria-label="Select report investigation"
            value={selected?.id}
            onChange={(event) => {
              setActiveInvestigation(event.target.value);
            }}
          >
            <option value={selected?.id}>
              {selected?.id} · {selectedVendorRecord?.name}
            </option>
            {state.investigations
              .filter((item) => item.id !== selected?.id)
              .map((item) => (
                <option value={item.id} key={item.id}>
                  {item.id} · {state.vendors.find((vendor) => vendor.id === item.vendorId)?.name}
                </option>
              ))}
          </select>
        </div>
        <div className="report-summary">
          <div>
            <span>Selected assessment</span>
            <strong>{selectedVendorRecord?.name}</strong>
            <small>
              {selected?.id} · {selected?.product}
            </small>
          </div>
          <div>
            <span>Decision-support score</span>
            <strong>
              {currentScore.score} <RiskBadge risk={currentScore.risk} />
            </strong>
            <small>Confidence {currentScore.confidence}%</small>
          </div>
          <div>
            <span>Open findings</span>
            <strong>
              {
                selectedFindings.filter((item) => !["Resolved", "Rejected"].includes(item.status))
                  .length
              }
            </strong>
            <small>
              Across {new Set(selectedFindings.map((item) => item.dimension)).size} dimensions
            </small>
          </div>
        </div>
        <Panel title="Report library" eyebrow="Generated from current local data">
          <div className="report-grid">
            {reports.map((report, index) => (
              <article className="report-card" key={report}>
                <span className="report-icon">
                  <FileText size={18} />
                </span>
                <div>
                  <h3>{report}</h3>
                  <p>
                    {
                      [
                        "Score, risk dimensions, key findings, evidence, and next steps.",
                        "Concise overview for the Asterion review group.",
                        "Evidence sources, dates, extraction state, and links.",
                        "Compatibility status, known gaps, and recommended actions.",
                        "Chronological investigation and reviewer activity.",
                        "Current alerts and review status in this demo.",
                      ][index]
                    }
                  </p>
                  <StatusBadge tone="demo">Uses current demo data</StatusBadge>
                </div>
                <footer>
                  <Button
                    variant="outline"
                    onClick={() =>
                      downloadCsv(`${report.toLowerCase().replaceAll(" ", "-")}.csv`, [
                        [
                          "Title",
                          "Dimension",
                          "Severity",
                          "Confidence",
                          "Status",
                          "Source",
                          "Next step",
                        ],
                        ...selectedFindings.map((item) => [
                          item.title,
                          item.dimension,
                          item.severity,
                          `${item.confidence}%`,
                          item.status,
                          item.source,
                          item.nextStep,
                        ]),
                      ])
                    }
                  >
                    <ArrowDownToLine size={14} /> CSV
                  </Button>
                  <Button
                    onClick={() =>
                      downloadBlob(reportBlob, `${report.toLowerCase().replaceAll(" ", "-")}.html`)
                    }
                  >
                    <FileJson2 size={14} /> Export report
                  </Button>
                </footer>
              </article>
            ))}
          </div>
        </Panel>
        <div className="report-export-actions">
          <Panel title="Structured investigation data" eyebrow="Machine-readable">
            <p className="panel-description">
              Export the selected assessment, findings, evidence register, integration checks, and
              simulation disclaimer as JSON.
            </p>
            <Button variant="outline" onClick={() => selected && exportInvestigation(selected)}>
              <FileJson2 size={15} /> Download JSON
            </Button>
          </Panel>
          <Panel title="Print-friendly assessment" eyebrow="Browser print">
            <p className="panel-description">
              Open the current assessment in a clean layout and use your browser's print dialog to
              save or print.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                const url = URL.createObjectURL(reportBlob);
                window.open(url, "_blank", "noopener,noreferrer");
                notify("Print view opened in a new tab.");
              }}
            >
              <ArrowDownToLine size={15} /> Open print view
            </Button>
          </Panel>
        </div>
      </>
    );
  }

  function renderSettings() {
    const weights = dimensions.map((dimension) => ({
      dimension,
      value: Math.round(riskWeightsByAppetite[state.appetite][dimension] * 100),
    }));
    return (
      <>
        <div className="kyro-page-title-row">
          <div>
            <div className="kyro-eyebrow">Workspace / Preferences</div>
            <h1>Settings</h1>
            <p>Configure the Asterion scenario, review policy, and demo behavior.</p>
          </div>
          <StatusBadge tone="demo">Local demo mode</StatusBadge>
        </div>
        <div className="settings-grid">
          <Panel title="Hospital profile" eyebrow="Fictional network">
            <div className="settings-profile">
              <span className="workspace-icon">
                <Building2 />
              </span>
              <div>
                <h3>Asterion Medical Network</h3>
                <p>Fictional healthcare organisation · India</p>
              </div>
              <Button
                variant="outline"
                onClick={() => notify("Profile values are fixed scenario data in this demo.")}
              >
                View profile
              </Button>
            </div>
            <div className="settings-facts">
              <div>
                <span>Network size</span>
                <strong>4 hospitals · 2,400 beds</strong>
              </div>
              <div>
                <span>IT organisation</span>
                <strong>1 central IT team</strong>
              </div>
              <div>
                <span>Existing systems</span>
                <strong>HIS · LIS · PACS · Identity provider</strong>
              </div>
              <div>
                <span>Required standards</span>
                <strong>HL7 v2 · FHIR R4 · DICOM · Applicable ABDM</strong>
              </div>
              <div>
                <span>Data residency</span>
                <strong>India</strong>
              </div>
            </div>
          </Panel>
          <Panel title="Risk scoring" eyebrow="Deterministic rules">
            <div className="settings-weights">
              {dimensions.map((dimension) => {
                const value = Math.round(riskWeightsByAppetite[state.appetite][dimension] * 100);
                return (
                  <div key={dimension}>
                    <span>{dimension}</span>
                    <strong>{value}%</strong>
                    <div className="kyro-bar-track">
                      <i style={{ width: `${value * 3}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="settings-risk-appetite">
              <div>
                <strong>Risk appetite</strong>
                <small>
                  Illustrative demo weighting profile; does not change underlying evidence.
                </small>
              </div>
              <select
                aria-label="Risk appetite"
                value={state.appetite}
                onChange={(event) => {
                  setState((current) => ({
                    ...current,
                    appetite: event.target.value as KyroState["appetite"],
                  }));
                  notify(`Risk appetite set to ${event.target.value}.`);
                }}
              >
                <option>Conservative</option>
                <option>Balanced</option>
                <option>Aggressive</option>
              </select>
            </div>
            <div className="score-note">
              <Gauge size={15} /> Dimension scores are 100 minus severity-weighted unresolved
              penalties. Confidence is calculated separately. An unresolved critical finding remains
              flagged.
            </div>
          </Panel>
          <Panel title="Review preferences" eyebrow="Human oversight">
            <div className="settings-check-list">
              {[
                "Use all dimensions by default for new investigations",
                "Evidence gaps remain visible as unknown",
                "Require human review before final procurement decisions",
                "Notify on high-severity findings",
              ].map((label, index) => (
                <label key={label}>
                  <input
                    type="checkbox"
                    checked={state.reviewPreferences?.[index] ?? index !== 1}
                    onChange={(event) => {
                      setState((current) => {
                        const preferences = current.reviewPreferences ?? [true, false, true, true];
                        return {
                          ...current,
                          reviewPreferences: preferences.map((value, preferenceIndex) =>
                            preferenceIndex === index ? event.target.checked : value,
                          ),
                        };
                      });
                      notify("Review preference saved in this browser.");
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </Panel>
          <Panel title="Demo configuration" eyebrow="No live services">
            <div className="settings-demo">
              <span className="demo-mode-icon">
                <ShieldCheck />
              </span>
              <div>
                <strong>Simulated data environment</strong>
                <p>
                  All sample organisations, claims, documents, activity, and monitoring signals are
                  fictional. No live vendor research, external AI, vulnerability database, or
                  hospital integration is active.
                </p>
              </div>
            </div>
            <div className="settings-actions">
              <Button variant="outline" onClick={launchGuidedDemo}>
                <Play size={14} /> Launch guided demo
              </Button>
              <Button variant="outline" onClick={() => setModal("security")}>
                <LockKeyhole size={14} /> Security challenge
              </Button>
              <Button variant="destructive" onClick={() => setModal("reset")}>
                <RefreshCw size={14} /> Reset demo data
              </Button>
            </div>
          </Panel>
          <Panel title="Security architecture challenge" eyebrow="Simulated access control">
            <div className="security-flow">
              <div>
                <StatusBadge tone="critical">BEFORE</StatusBadge>
                <p>
                  Unauthorised request <ArrowRight size={13} /> insufficient access validation{" "}
                  <ArrowRight size={13} /> sensitive information exposed
                </p>
              </div>
              <div>
                <StatusBadge tone="completed">AFTER</StatusBadge>
                <p>
                  User request <ArrowRight size={13} /> authentication <ArrowRight size={13} />{" "}
                  hospital authorisation <ArrowRight size={13} /> minimum necessary response{" "}
                  <ArrowRight size={13} /> audit event
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setModal("security")}>
              <ShieldAlert size={15} /> Attempt cross-hospital access
            </Button>
            <p className="security-footnote">
              Design demonstration only; this is not a production security certification or
              penetration test.
            </p>
          </Panel>
          <Panel title="Typography preview" eyebrow="Inter · single typeface">
            <div className="type-preview">
              <h2>A clear view of your vendor landscape.</h2>
              <p>
                Evidence should be reviewed in context. Missing evidence is uncertainty, not proof
                of noncompliance.
              </p>
              <div className="kyro-table-wrap">
                <table className="kyro-table">
                  <tbody>
                    <tr>
                      <td>Assessment record</td>
                      <td>Interoperability Guide</td>
                      <td>
                        <StatusBadge tone="review">Review required</StatusBadge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <Button onClick={() => notify("Typography preview action is working.")}>
                Example action
              </Button>
              <div>
                <RiskBadge risk="Moderate" />
              </div>
            </div>
          </Panel>
        </div>
      </>
    );
  }

  function renderTimeline() {
    return (
      <>
        <div className="kyro-page-title-row">
          <div>
            <div className="kyro-eyebrow">Audit / Local history</div>
            <h1>Activity timeline</h1>
            <p>Meaningful operations from the current browser's demo scenario.</p>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv("kyro-activity-timeline.csv", [
                ["Timestamp", "Type", "Description", "Vendor", "Investigation"],
                ...state.timeline.map((event) => [
                  event.at,
                  event.type,
                  event.description,
                  state.vendors.find((vendor) => vendor.id === event.vendorId)?.name ?? "",
                  event.investigationId ?? "",
                ]),
              ])
            }
          >
            <ArrowDownToLine size={14} /> Export CSV
          </Button>
        </div>
        <Panel title="Audit events" eyebrow={`${state.timeline.length} events`}>
          <TimelinePanel events={state.timeline} expanded />
        </Panel>
      </>
    );
  }

  const body =
    view === "Overview"
      ? renderOverview()
      : view === "Vendors"
        ? renderVendors()
        : view === "Investigations"
          ? renderInvestigations()
          : view === "Investigation detail"
            ? renderInvestigationDetail()
            : view === "Documents"
              ? renderDocuments()
              : view === "Integration Fit"
                ? renderIntegration()
                : view === "Risk Monitoring"
                  ? renderMonitoring()
                  : view === "Reports"
                    ? renderReports()
                    : view === "Settings"
                      ? renderSettings()
                      : renderTimeline();

  return (
    <div className="kyro-app">
      <aside className={`kyro-sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <button className="kyro-brand" onClick={() => selectView("Overview")}>
          <span className="kyro-brand-mark">
            <i />
            <i />
            <i />
          </span>
          <span>
            KYRO<small>VENDOR INTELLIGENCE</small>
          </span>
        </button>
        <div className="sidebar-workspace">
          <span className="workspace-icon">
            <Building2 size={16} />
          </span>
          <span>
            <strong>Asterion Medical Network</strong>
            <small>Fictional workspace</small>
          </span>
          <ChevronDown size={14} />
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="kyro-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={
                view === label || (label === "Investigations" && view === "Investigation detail")
                  ? "active"
                  : ""
              }
              onClick={() => selectView(label)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {label === "Risk Monitoring" &&
                state.alerts.some((alert) => alert.status === "Open") && (
                  <i className="nav-count">
                    {state.alerts.filter((alert) => alert.status === "Open").length}
                  </i>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-label sidebar-label--lower">RECENT INVESTIGATIONS</div>
        <div className="sidebar-recent">
          {state.investigations.slice(0, 3).map((item) => (
            <button
              key={item.id}
              className={
                view === "Investigation detail" && item.id === activeInvestigation ? "active" : ""
              }
              onClick={() => openInvestigation(item.id)}
            >
              <span className={`recent-dot ${item.status.toLowerCase()}`} />
              <span>
                <strong>
                  {state.vendors.find((vendor) => vendor.id === item.vendorId)?.name ?? "Vendor"}
                </strong>
                <small>{item.id}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="sidebar-spacer" />
        <div className="sidebar-demo-note">
          <span>
            <ShieldCheck size={14} /> Demo mode
          </span>
          <small>Fictional local data · no live research</small>
        </div>
        <button className="sidebar-user" onClick={() => selectView("Settings")}>
          <span className="user-avatar">AS</span>
          <span>
            <strong>Aarushi Sachdeva</strong>
            <small>Hospital reviewer</small>
          </span>
          <Settings size={15} />
        </button>
      </aside>
      {mobileNav && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="kyro-main">
        <header className="kyro-topbar">
          <div className="topbar-left">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu-button"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu />
            </Button>
            <div className="topbar-breadcrumb">
              <span>Asterion Medical Network</span>
              <ChevronRight size={14} />
              <strong>{view === "Investigation detail" ? currentInvestigation?.id : view}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="global-search">
              <Search size={15} />
              <Input
                aria-label="Search vendors, investigations, documents"
                placeholder="Search vendors, investigations…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>⌘ K</kbd>
              {search && (
                <div className="global-search-results">
                  {globalResults.map((result, index) => (
                    <button
                      key={`${result.type}-${index}`}
                      onClick={() => {
                        result.action();
                        setSearch("");
                      }}
                    >
                      <span>{result.label}</span>
                      <small>{result.type}</small>
                    </button>
                  ))}
                  {!globalResults.length && <p>No matching records</p>}
                </div>
              )}
            </div>
            <div className="notification-anchor">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Notifications, ${unreadCount} unread`}
                onClick={() => setNotificationOpen((open) => !open)}
              >
                <Bell />
                {unreadCount > 0 && <i className="notification-count">{unreadCount}</i>}
              </Button>
              {notificationOpen && (
                <div className="notification-popover">
                  <header>
                    <span>
                      <strong>Notifications</strong>
                      <small>{unreadCount} unread</small>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setState((current) => ({
                          ...current,
                          notifications: current.notifications.map((item) => ({
                            ...item,
                            read: true,
                          })),
                        }))
                      }
                    >
                      Mark all read
                    </Button>
                  </header>
                  {state.notifications.map((item) => (
                    <button
                      key={item.id}
                      className={`notification-item ${item.read ? "read" : ""}`}
                      onClick={() => {
                        markNotification(item.id);
                        if (item.vendorId) {
                          setSelectedVendor(item.vendorId);
                          selectView("Vendors");
                        }
                      }}
                    >
                      <span className="notification-dot" />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              className="profile-button"
              onClick={() => selectView("Settings")}
            >
              <span className="user-avatar">AS</span>
              <ChevronDown size={13} />
            </Button>
          </div>
        </header>
        <main className="kyro-content">{body}</main>
        <footer className="kyro-footer">
          <span>
            KYRO <i>DEMO WORKSPACE</i>
          </span>
          <span>Fictional scenario data · No live vendor verification</span>
          <button onClick={() => selectView("Settings")}>Demo settings</button>
        </footer>
      </div>
      {modal === "vendor" && (
        <MiniModal
          title={editingVendorId ? "Edit fictional vendor" : "Add fictional vendor"}
          description={
            editingVendorId
              ? "Update this local scenario record."
              : "Create a vendor record in this browser-only scenario."
          }
          onClose={() => {
            setReturnToWizard(false);
            setModal(null);
          }}
        >
          <form
            className="kyro-form"
            onSubmit={(event) => {
              event.preventDefault();
              const name = vendorForm.name.trim();
              if (!name) return;
              const vendor: Vendor = {
                ...(editingVendorId
                  ? state.vendors.find((item) => item.id === editingVendorId)
                  : {}),
                id: editingVendorId ?? createId("v"),
                name,
                category: vendorForm.category.trim() || "Healthcare technology",
                products: vendorForm.product.trim()
                  ? vendorForm.product
                      .split(",")
                      .map((product) => product.trim())
                      .filter(Boolean)
                  : ["New product"],
                summary:
                  vendorForm.summary.trim() ||
                  "New fictional vendor record; evidence has not been assessed.",
                evidenceCompleteness: editingVendorId
                  ? (state.vendors.find((item) => item.id === editingVendorId)
                      ?.evidenceCompleteness ?? 0)
                  : 0,
                updated: today(),
              };
              setState((current) => ({
                ...current,
                vendors: editingVendorId
                  ? current.vendors.map((item) => (item.id === editingVendorId ? vendor : item))
                  : [vendor, ...current.vendors],
              }));
              logEvent(
                `${editingVendorId ? "Updated" : "Added"} fictional vendor record ${vendor.name}.`,
                editingVendorId ? "Vendor updated" : "Vendor created",
                vendor.id,
              );
              const resumeWizard = returnToWizard;
              setReturnToWizard(false);
              setModal(resumeWizard ? "wizard" : null);
              setEditingVendorId(null);
              setSelectedVendor(vendor.id);
              if (resumeWizard) {
                setWizardVendor(vendor.id);
                setWizardProduct(vendor.products[0] ?? "New product");
                setWizardStep(1);
              }
              notify(editingVendorId ? "Fictional vendor updated." : "Fictional vendor added.");
            }}
          >
            <label>
              Vendor name
              <Input
                required
                value={vendorForm.name}
                onChange={(event) =>
                  setVendorForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="e.g. Northstar Health Systems"
              />
            </label>
            <label>
              Category
              <Input
                value={vendorForm.category}
                onChange={(event) =>
                  setVendorForm((current) => ({ ...current, category: event.target.value }))
                }
              />
            </label>
            <label>
              Product
              <Input
                value={vendorForm.product}
                onChange={(event) =>
                  setVendorForm((current) => ({ ...current, product: event.target.value }))
                }
                placeholder="Product name"
              />
            </label>
            <label>
              Company overview
              <textarea
                value={vendorForm.summary}
                onChange={(event) =>
                  setVendorForm((current) => ({ ...current, summary: event.target.value }))
                }
                placeholder="Optional fictional description"
              />
            </label>
            <div className="kyro-modal-actions">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setReturnToWizard(false);
                  setModal(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                <Plus size={14} /> {editingVendorId ? "Save changes" : "Add vendor"}
              </Button>
            </div>
          </form>
        </MiniModal>
      )}
      {modal === "wizard" && (
        <MiniModal
          title="New investigation"
          description={`Step ${wizardStep + 1} of 4 · Configure a local simulated review`}
          onClose={() => setModal(null)}
          wide
        >
          <div className="wizard-progress">
            {["Vendor", "Product", "Scope", "Review"].map((label, index) => (
              <span className={index <= wizardStep ? "active" : ""} key={label}>
                <i>{index < wizardStep ? <Check size={12} /> : index + 1}</i>
                {label}
              </span>
            ))}
          </div>
          {wizardStep === 0 && (
            <div className="wizard-content">
              <h3>Select a fictional vendor</h3>
              <div className="wizard-options">
                {state.vendors.map((vendor) => (
                  <button
                    key={vendor.id}
                    className={wizardVendor === vendor.id ? "selected" : ""}
                    onClick={() => {
                      setWizardVendor(vendor.id);
                      setWizardProduct(vendor.products[0] ?? "New product");
                    }}
                  >
                    <span className="vendor-avatar">{getInitials(vendor.name)}</span>
                    <span>
                      <strong>{vendor.name}</strong>
                      <small>{vendor.category}</small>
                    </span>
                    {wizardVendor === vendor.id && <CheckCircle2 />}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setReturnToWizard(true);
                  setEditingVendorId(null);
                  setModal("vendor");
                  setVendorForm({
                    name: "",
                    category: "Healthcare technology",
                    product: "",
                    summary: "",
                  });
                }}
              >
                Create a fictional vendor first
              </Button>
            </div>
          )}
          {wizardStep === 1 && (
            <div className="wizard-content">
              <h3>Select the product</h3>
              <label>
                Vendor product
                <select
                  aria-label="Select product"
                  value={wizardProduct}
                  onChange={(event) => setWizardProduct(event.target.value)}
                >
                  {(state.vendors.find((item) => item.id === wizardVendor)?.products ?? []).map(
                    (product) => (
                      <option key={product}>{product}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Hospital context
                <select
                  aria-label="Select hospital context"
                  value={hospitalContext}
                  onChange={(event) => setHospitalContext(event.target.value)}
                >
                  <option>Asterion Medical Network · All hospitals</option>
                  <option>Asterion Medical Network · Diagnostics</option>
                  <option>Asterion Medical Network · Central IT</option>
                </select>
              </label>
            </div>
          )}
          {wizardStep === 2 && (
            <div className="wizard-content">
              <h3>Select investigation dimensions</h3>
              <div className="wizard-dimension-grid">
                {dimensions.map((dimension) => (
                  <label key={dimension}>
                    <input
                      type="checkbox"
                      checked={wizardDimensions.includes(dimension)}
                      onChange={() => toggleDimension(dimension)}
                    />
                    {dimension}
                  </label>
                ))}
              </div>
              <h3>Include available evidence</h3>
              <div className="wizard-evidence-list">
                {state.documents
                  .filter((doc) => doc.vendorId === wizardVendor)
                  .map((doc) => (
                    <span key={doc.id}>
                      <FileText size={14} />
                      {doc.name}
                      <Check size={13} />
                    </span>
                  ))}
              </div>
            </div>
          )}
          {wizardStep === 3 && (
            <div className="wizard-review">
              <div>
                <span>Vendor</span>
                <strong>{state.vendors.find((vendor) => vendor.id === wizardVendor)?.name}</strong>
              </div>
              <div>
                <span>Product</span>
                <strong>{wizardProduct}</strong>
              </div>
              <div>
                <span>Hospital</span>
                <strong>{hospitalContext}</strong>
              </div>
              <div>
                <span>Dimensions</span>
                <strong>
                  {wizardDimensions.length
                    ? wizardDimensions.join(" · ")
                    : "No dimensions selected"}
                </strong>
              </div>
              <p>
                <ShieldCheck size={15} /> Starting creates a browser-persisted local simulation.
                Progress is prewritten, deterministic, and does not use external AI.
              </p>
            </div>
          )}
          <div className="kyro-modal-actions">
            <Button
              variant="outline"
              onClick={() =>
                wizardStep === 0
                  ? (setReturnToWizard(false), setModal(null))
                  : setWizardStep((step) => step - 1)
              }
            >
              {wizardStep === 0 ? (
                "Cancel"
              ) : (
                <>
                  <ArrowLeft size={14} /> Back
                </>
              )}
            </Button>
            {wizardStep < 3 ? (
              <Button
                disabled={wizardStep === 2 && wizardDimensions.length === 0}
                onClick={() => setWizardStep((step) => step + 1)}
              >
                Continue <ArrowRight size={14} />
              </Button>
            ) : (
              <Button onClick={createInvestigation} disabled={!wizardDimensions.length}>
                <Play size={14} /> Start investigation
              </Button>
            )}
          </div>
        </MiniModal>
      )}
      {modal === "security" && (
        <MiniModal
          title="Cross-hospital access test"
          description="Simulated access-control challenge · Not a production security certification"
          onClose={() => {
            setReturnToWizard(false);
            setModal(null);
          }}
        >
          <div className="security-test-result">
            <span className="security-test-icon">
              <ShieldCheck size={26} />
            </span>
            <StatusBadge tone="critical">403 · Request blocked</StatusBadge>
            <h3>Hospital-level access denied</h3>
            <p>
              The selected user does not belong to the requested hospital. The response contains no
              document content and no cross-hospital records were revealed.
            </p>
            <div className="security-flow-result">
              <span>User request</span>
              <ArrowRight />
              <span>Hospital authorisation</span>
              <ArrowRight />
              <strong>Blocked</strong>
            </div>
            <div className="masked-fields">
              <span>Response body</span>
              <code>{'{ "error": "forbidden", "detail": "content withheld" }'}</code>
            </div>
            <small>
              <CheckCircle2 size={13} /> A simulated audit event was added to the local history.
            </small>
          </div>
          <div className="kyro-modal-actions">
            <Button variant="outline" onClick={() => setModal(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                logEvent(
                  "Simulated cross-hospital access request denied with HTTP-style 403; no protected data returned.",
                  "Security access blocked",
                );
                setModal(null);
                notify("Cross-hospital request blocked. Simulated audit event recorded.");
              }}
            >
              Run test again
            </Button>
          </div>
        </MiniModal>
      )}
      {modal === "reset" && (
        <MiniModal
          title="Reset demo data?"
          description="This restores the deterministic seed scenario and removes browser changes."
          onClose={() => setModal(null)}
        >
          <div className="reset-warning">
            <AlertTriangle size={22} />
            <p>
              Added vendors, uploaded records, review states, alerts, and investigation progress in
              this browser will be replaced by the original sample scenario.
            </p>
          </div>
          <div className="kyro-modal-actions">
            <Button variant="outline" onClick={() => setModal(null)}>
              Keep current data
            </Button>
            <Button variant="destructive" onClick={resetDemo}>
              Reset to seed data
            </Button>
          </div>
        </MiniModal>
      )}
      {modal === "archive" && pendingArchiveId && (
        <MiniModal
          title={
            state.vendors.find((vendor) => vendor.id === pendingArchiveId)?.archived
              ? "Restore vendor?"
              : "Archive vendor?"
          }
          description="This only changes the fictional vendor record in this browser."
          onClose={() => setModal(null)}
        >
          <p className="panel-description">
            {state.vendors.find((vendor) => vendor.id === pendingArchiveId)?.name} and its history
            remain saved; archiving hides it from the default vendor list.
          </p>
          <div className="kyro-modal-actions">
            <Button variant="outline" onClick={() => setModal(null)}>
              Keep current status
            </Button>
            <Button
              onClick={() => {
                const vendor = state.vendors.find((item) => item.id === pendingArchiveId);
                if (!vendor) return;
                const archived = !vendor.archived;
                setState((current) => ({
                  ...current,
                  vendors: current.vendors.map((item) =>
                    item.id === vendor.id ? { ...item, archived } : item,
                  ),
                }));
                logEvent(
                  `${archived ? "Archived" : "Restored"} fictional vendor ${vendor.name}.`,
                  archived ? "Vendor archived" : "Vendor restored",
                  vendor.id,
                );
                setModal(null);
                setPendingArchiveId(null);
                notify(`Vendor ${archived ? "archived" : "restored"}.`);
              }}
            >
              {state.vendors.find((vendor) => vendor.id === pendingArchiveId)?.archived
                ? "Restore"
                : "Archive"}
            </Button>
          </div>
        </MiniModal>
      )}
      {modal === "delete-document" && pendingDeleteDocument && (
        <MiniModal
          title="Remove document?"
          description="The record will be removed from this browser’s local demo library."
          onClose={() => setModal(null)}
        >
          <p className="panel-description">
            {state.documents.find((item) => item.id === pendingDeleteDocument)?.name}
          </p>
          <div className="kyro-modal-actions">
            <Button variant="outline" onClick={() => setModal(null)}>
              Keep document
            </Button>
            <Button variant="destructive" onClick={() => deleteDocument(pendingDeleteDocument)}>
              Remove document
            </Button>
          </div>
        </MiniModal>
      )}
      {modal === "cancel" && pendingCancelId && (
        <MiniModal
          title="Cancel investigation?"
          description="This marks the local investigation as cancelled; its notes and evidence remain available."
          onClose={() => setModal(null)}
        >
          <div className="kyro-modal-actions">
            <Button variant="outline" onClick={() => setModal(null)}>
              Keep investigation
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setInvestigationStatus(pendingCancelId, "Cancelled");
                setModal(null);
                setPendingCancelId(null);
              }}
            >
              Cancel investigation
            </Button>
          </div>
        </MiniModal>
      )}
      {currentFinding && (
        <MiniModal
          title={currentFinding.title}
          description={`${currentFinding.id} · ${currentFinding.dimension} · ${state.vendors.find((vendor) => vendor.id === currentFinding.vendorId)?.name ?? "Fictional vendor"}`}
          onClose={() => setSelectedFinding(null)}
          wide
        >
          <div className="finding-detail">
            <div className="finding-badges">
              <RiskBadge risk={currentFinding.severity} />
              <StatusBadge tone={currentFinding.status.toLowerCase().replaceAll(" ", "-")}>
                {currentFinding.status}
              </StatusBadge>
              <span className="confidence-number">
                Evidence confidence {currentFinding.confidence}%
              </span>
            </div>
            <div className="finding-detail-grid">
              <section>
                <span className="kyro-eyebrow">Summary</span>
                <p>{currentFinding.summary}</p>
                <span className="kyro-eyebrow">Why it matters</span>
                <p>{currentFinding.why}</p>
                <span className="kyro-eyebrow">Recommended next step</span>
                <p>{currentFinding.nextStep}</p>
              </section>
              <aside>
                <h3>Evidence record</h3>
                <p>{currentFinding.source}</p>
                <StatusBadge tone="demo">Fictional source · not independently verified</StatusBadge>
                <h3>Review history</h3>
                <p>
                  Current status: {currentFinding.status}. Any decision must be made by an
                  authorised human reviewer.
                </p>
              </aside>
            </div>
            <label className="review-note-label">
              Reviewer note
              <textarea
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder="Add a local review note before recording a decision"
              />
            </label>
            <div className="kyro-modal-actions finding-actions">
              <Button variant="outline" onClick={() => startDebate(currentFinding)}>
                <GitBranch size={14} /> Challenge finding
              </Button>
              <Button
                variant="outline"
                onClick={() => updateFinding(currentFinding.id, "Under review", reviewNote)}
              >
                Request evidence
              </Button>
              <Button
                variant="outline"
                onClick={() => updateFinding(currentFinding.id, "Rejected", reviewNote)}
              >
                Reject
              </Button>
              <Button
                variant="secondary"
                onClick={() => updateFinding(currentFinding.id, "Accepted risk", reviewNote)}
              >
                Accept risk
              </Button>
              <Button onClick={() => updateFinding(currentFinding.id, "Resolved", reviewNote)}>
                <Check size={14} /> Mark resolved
              </Button>
            </div>
          </div>
        </MiniModal>
      )}
      {currentDocument && (
        <MiniModal
          title={currentDocument.name}
          description={`${currentDocument.type} · ${state.vendors.find((vendor) => vendor.id === currentDocument.vendorId)?.name ?? "Vendor"}`}
          onClose={() => setSelectedDocument(null)}
          wide
        >
          <div className="document-detail">
            <div className="document-preview-pane">
              <div className="document-paper">
                <span className="document-demo-stamp">FICTIONAL DEMO</span>
                <FileText size={30} />
                <h3>{currentDocument.name.replace(/\.[^.]+$/, "")}</h3>
                <p>{documentPreviewDraft}</p>
                <small>
                  {currentDocument.pages
                    ? `${currentDocument.pages} pages`
                    : "Page count not extracted"}{" "}
                  · {currentDocument.size}
                </small>
              </div>
            </div>
            <aside className="document-metadata">
              <div>
                <span>Text source</span>
                <strong>Simulated extraction only</strong>
              </div>
              <label className="review-note-label">
                Simulated text preview · editable local field
                <textarea
                  aria-label="Extracted text preview"
                  value={documentPreviewDraft}
                  onChange={(event) => setDocumentPreviewDraft(event.target.value)}
                  rows={7}
                />
              </label>
              <Button
                variant="outline"
                onClick={() => {
                  setState((current) => ({
                    ...current,
                    documents: current.documents.map((item) =>
                      item.id === currentDocument.id
                        ? { ...item, preview: documentPreviewDraft }
                        : item,
                    ),
                    investigations: currentDocument.investigationId
                      ? current.investigations.map((item) =>
                          item.id === currentDocument.investigationId
                            ? { ...item, updated: today() }
                            : item,
                        )
                      : current.investigations,
                  }));
                  logEvent(
                    `Updated the simulated text field for ${currentDocument.name}.`,
                    "Document text edited",
                    currentDocument.vendorId,
                    currentDocument.investigationId,
                  );
                  notify("Document text saved in this browser.");
                }}
              >
                Save text
              </Button>
              <div>
                <span>Document date</span>
                <strong>{formatDate(currentDocument.documentDate)}</strong>
              </div>
              <div>
                <span>Extraction status</span>
                <StatusBadge tone="processed">Simulated</StatusBadge>
              </div>
              <div>
                <span>Verification</span>
                <StatusBadge tone="review">Not independently verified</StatusBadge>
              </div>
              <div>
                <span>Associated findings</span>
                {state.findings
                  .filter(
                    (finding) =>
                      finding.vendorId === currentDocument.vendorId &&
                      finding.source === currentDocument.name,
                  )
                  .map((finding) => (
                    <button
                      className="document-finding-link"
                      key={finding.id}
                      onClick={() => {
                        setSelectedDocument(null);
                        setSelectedFinding(finding.id);
                      }}
                    >
                      {finding.title}
                      <ArrowRight size={13} />
                    </button>
                  ))}
              </div>
              <div className="simulated-extraction-box">
                <strong>Extraction disclaimer</strong>
                <p>
                  {currentDocument.simulated
                    ? "The file content was not parsed. The text shown is a prewritten fictional scenario excerpt."
                    : "Uploaded files are not parsed or read by this local demo."}
                </p>
              </div>
            </aside>
          </div>
        </MiniModal>
      )}
      {guidedStep !== null && (
        <div className="guided-demo">
          <span className="guided-demo-badge">
            <Sparkles size={14} /> GUIDED DEMO · {guidedStep + 1} / 8
          </span>
          <h2>
            {
              [
                "Portfolio overview",
                "Vendor profile",
                "Evidence library",
                "Investigation score",
                "Specialist activity",
                "Skeptic debate",
                "Integration gaps",
                "Final report",
              ][guidedStep]
            }
          </h2>
          <p>
            {
              [
                "Start with the fictional hospital network's risk picture.",
                "Open a fictional vendor and review evidence coverage.",
                "Inspect the clearly labelled fictional document records.",
                "Follow the current local investigation and score breakdown.",
                "Review prewritten specialist activity; no AI is contacted.",
                "See a structured challenge that preserves uncertainty.",
                "Compare documented capability with hospital requirements.",
                "Export the current assessment from actual local demo state.",
              ][guidedStep]
            }
          </p>
          <div>
            <Button variant="outline" onClick={() => advanceGuided(-1)}>
              Exit demo
            </Button>
            <Button
              variant="ghost"
              onClick={() => advanceGuided(guidedStep - 1)}
              disabled={guidedStep === 0}
            >
              <ArrowLeft size={14} /> Previous
            </Button>
            <Button onClick={() => advanceGuided(guidedStep + 1)}>
              {guidedStep === 7 ? "Finish" : "Next"} <ArrowRight size={14} />
            </Button>
          </div>
          <button className="guided-skip" onClick={() => setGuidedStep(null)}>
            Skip guide
          </button>
        </div>
      )}
      {toast && (
        <div className="kyro-toast" role="status">
          <CheckCircle2 size={17} />
          <span>{toast}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X />
          </Button>
        </div>
      )}
    </div>
  );
}

function IntegrationTable({
  checks,
  onChange,
  onRequirementChange,
}: {
  checks: IntegrationCheck[];
  onChange: (id: string, status: IntegrationCheck["status"]) => void;
  onRequirementChange?: (id: string, requirement: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <Panel title="Compatibility matrix" eyebrow="Vendor capability vs hospital requirement">
      <div className="kyro-table-wrap">
        <table className="kyro-table integration-table">
          <thead>
            <tr>
              <th>Requirement</th>
              <th>Hospital requirement</th>
              <th>Vendor capability</th>
              <th>Status</th>
              <th>Evidence</th>
              <th>Gap / next step</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {checks.map((check) => (
              <tr key={check.id}>
                <td>
                  <strong>{check.requirement}</strong>
                  {check.required && <small>Required</small>}
                </td>
                <td>
                  {onRequirementChange ? (
                    <input
                      aria-label={`Hospital requirement for ${check.requirement}`}
                      value={check.hospitalRequirement}
                      onChange={(event) => onRequirementChange(check.id, event.target.value)}
                    />
                  ) : (
                    check.hospitalRequirement
                  )}
                </td>
                <td>
                  {check.status === "Compatible"
                    ? "Documented support"
                    : check.status === "Partial"
                      ? "Partial evidence"
                      : check.status === "Incompatible"
                        ? "Gap indicated"
                        : "Not established"}
                </td>
                <td>
                  <select
                    aria-label={`Change status for ${check.requirement}`}
                    className={`integration-select ${check.status.toLowerCase()}`}
                    value={check.status}
                    onChange={(event) =>
                      onChange(check.id, event.target.value as IntegrationCheck["status"])
                    }
                  >
                    <option>Compatible</option>
                    <option>Partial</option>
                    <option>Incompatible</option>
                    <option>Unknown</option>
                  </select>
                </td>
                <td>
                  {check.evidence}
                  <Button
                    className="evidence-expand"
                    variant="link"
                    onClick={() => setExpandedId(expandedId === check.id ? null : check.id)}
                  >
                    {expandedId === check.id ? "Hide details" : "View evidence"}
                  </Button>
                </td>
                <td>
                  {check.nextStep}
                  <small>{check.effort}</small>
                  {expandedId === check.id && (
                    <div className="integration-gap-detail">
                      <strong>Gap</strong>
                      <p>{check.gap}</p>
                      <strong>Evidence excerpt</strong>
                      <p>{check.evidence}</p>
                    </div>
                  )}
                </td>
                <td>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Expand ${check.requirement}`}
                    onClick={() => setExpandedId(expandedId === check.id ? null : check.id)}
                  >
                    <ChevronDown />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="kyro-chart-caption">
        <CircleHelp size={14} /> Unknown rows are excluded from readiness calculation. DICOM C-STORE
        is not treated as DICOMweb evidence.
      </div>
    </Panel>
  );
}

function TimelinePanel({
  events,
  expanded = false,
}: {
  events: TimelineEvent[];
  expanded?: boolean;
}) {
  const [eventFilter, setEventFilter] = useState("All events");
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const types = Array.from(new Set(events.map((event) => event.type)));
  const filtered = events.filter(
    (event) => eventFilter === "All events" || event.type === eventFilter,
  );
  return (
    <div className="timeline-wrap">
      {expanded && (
        <div className="timeline-filter">
          <Filter size={14} />
          <select
            aria-label="Filter timeline event type"
            value={eventFilter}
            onChange={(event) => setEventFilter(event.target.value)}
          >
            <option>All events</option>
            {types.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </div>
      )}
      <div className="kyro-activity-list">
        {filtered.slice(0, expanded ? 50 : 12).map((event) => (
          <button
            className={`kyro-activity-item timeline-event ${selectedEvent === event.id ? "expanded" : ""}`}
            key={event.id}
            onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
          >
            <span className="activity-marker">
              <History size={13} />
            </span>
            <span>
              <strong>{event.description}</strong>
              <small>
                {event.type}
                {event.investigationId ? ` · ${event.investigationId}` : ""}
              </small>
              {selectedEvent === event.id && (
                <em>
                  {event.at} · Related vendor ID: {event.vendorId ?? "Workspace"}
                </em>
              )}
            </span>
            <time>{event.at.slice(0, 16).replace("T", " ")}</time>
          </button>
        ))}
      </div>
      {!filtered.length && <div className="kyro-empty compact">No events match this filter.</div>}
    </div>
  );
}
