# Kyro project overview

## Purpose

Kyro is a frontend concept for connecting vendor evidence, hospital-specific integration requirements, risk review, and procurement workflow in a single workspace. The included hospital network and vendors are fictional.

## Implemented demonstration

- Overview dashboard with metrics, risk distribution, evidence signals, review queues, alerts, and activity.
- Vendor directory with search, category/risk/status filters, sorting, table/card layouts, profile views, vendor creation, and investigation launch.
- Investigation register, multi-step creation wizard, simulated staged progress, pause/resume, instant completion, score breakdown, evidence, findings, agents, debate, integration, and timeline tabs.
- Local document library, multi-file upload, duplicate checks, metadata-only file records, editable simulated text previews, and generated fictional downloadable PDF samples.
- Deterministic risk scoring, editable integration status, implementation blueprint, monitoring alerts, report/CSV/JSON/print exports, notifications, settings, and a simulated 403 cross-hospital access challenge.
- Browser-local persistence and a confirmed restore-to-seed action.

## Limitations and content policy

Every sample organization, vendor, claim, evidence item, document, agent statement, alert, and assessment is fictional. This is not a live assessment service. It has no connected database, authentication, external AI, live vendor research, vulnerability feed, hospital deployment, independent evidence verification, certification, or regulatory approval. Uploaded file contents are never read or stored; only filenames and selected types are kept locally. Displayed extraction is labelled simulated. Scores are decision-support examples, not certification or procurement decisions. Human review is required. Do not submit patient data or confidential hospital documents.

## Local development

```sh
bun install
bun run dev
bun run lint
bun run test
bun run build
```

The application is served at `/` using TanStack Start and TanStack Router.
