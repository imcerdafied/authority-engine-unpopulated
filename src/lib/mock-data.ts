import { Decision, Signal, Pod, ClosedDecision } from "./types";

export const decisions: Decision[] = [
  {
    id: "d1",
    title: "Realign enterprise pricing tier",
    triggerSignal: "Enterprise NRR dropped 4pts in Q4",
    outcomeTarget: "Restore NRR to 115% within 60 days",
    impactTier: "High",
    segmentImpact: "Enterprise",
    owner: "Sarah Chen",
    status: "Active",
    createdDate: "2026-02-01",
  },
  {
    id: "d2",
    title: "Consolidate agent routing logic",
    triggerSignal: "Agent resolution variance exceeded 18%",
    outcomeTarget: "Reduce variance to <8% across all segments",
    impactTier: "High",
    owner: "Marcus Webb",
    status: "Active",
    createdDate: "2026-02-03",
  },
  {
    id: "d3",
    title: "Launch self-serve onboarding for SMB",
    triggerSignal: "SMB activation rate at 31%, target 55%",
    outcomeTarget: "Hit 50% activation within 30 days of launch",
    impactTier: "High",
    segmentImpact: "SMB",
    owner: "Priya Patel",
    status: "Active",
    createdDate: "2026-02-05",
  },
  {
    id: "d4",
    title: "Deprecate legacy analytics module",
    triggerSignal: "Maintenance cost 3x of replacement",
    outcomeTarget: "Zero legacy dependencies by March 15",
    impactTier: "Medium",
    owner: "James Liu",
    status: "Blocked",
    createdDate: "2026-02-04",
  },
  {
    id: "d5",
    title: "Hire VP of Revenue Operations",
    triggerSignal: "RevOps function has no owner",
    outcomeTarget: "Signed offer by Feb 28",
    impactTier: "High",
    owner: "CEO",
    status: "Active",
    createdDate: "2026-01-28",
  },
  {
    id: "d6",
    title: "Migrate payment processor",
    triggerSignal: "Current processor fee increase of 40bps",
    outcomeTarget: "Migration complete, zero downtime",
    impactTier: "Medium",
    owner: "Alex Torres",
    status: "Draft",
    createdDate: "2026-02-12",
  },
  {
    id: "d7",
    title: "Renegotiate cloud infrastructure contract",
    triggerSignal: "Annual renewal approaching with 22% overspend",
    outcomeTarget: "Reduce annual cloud spend by 15%",
    impactTier: "High",
    segmentImpact: "Infrastructure",
    owner: "Marcus Webb",
    status: "Active",
    createdDate: "2026-02-06",
  },
];

export const signals: Signal[] = [
  {
    id: "s1",
    type: "KPI Deviation",
    description: "Customer support CSAT dropped below 82% threshold",
    source: "Support Analytics",
    createdDate: "2026-02-14",
  },
  {
    id: "s2",
    type: "Segment Variance",
    description: "Mid-market churn rate 2.1x higher than enterprise",
    source: "Revenue Team",
    createdDate: "2026-02-13",
  },
  {
    id: "s3",
    type: "Agent Drift",
    description: "Agent response consistency score below 70% in APAC",
    source: "Agent Monitoring",
    createdDate: "2026-02-14",
  },
  {
    id: "s4",
    type: "Launch Milestone",
    description: "V3 API beta ready for controlled rollout",
    source: "Platform Team",
    createdDate: "2026-02-12",
  },
  {
    id: "s5",
    type: "Exec Escalation",
    description: "Board requesting updated GTM timeline",
    source: "CEO Office",
    createdDate: "2026-02-15",
  },
];

export const pods: Pod[] = [
  {
    id: "p1",
    name: "Growth Pod",
    owner: "Priya Patel",
    initiatives: [
      { id: "i1", name: "SMB self-serve onboarding", lastDemoDate: "2026-02-10", sliceDeadline: "2026-02-20", owner: "Priya Patel", outcomeLinked: true, shipped: false },
      { id: "i2", name: "Referral program v2", lastDemoDate: undefined, sliceDeadline: "2026-02-18", owner: "Dan Kim", outcomeLinked: false, shipped: false },
    ],
  },
  {
    id: "p2",
    name: "Platform Pod",
    owner: "Marcus Webb",
    initiatives: [
      { id: "i3", name: "Agent routing consolidation", lastDemoDate: "2026-02-08", sliceDeadline: "2026-02-22", owner: "Marcus Webb", outcomeLinked: true, shipped: false },
      { id: "i4", name: "V3 API beta", lastDemoDate: "2026-02-12", sliceDeadline: "2026-02-19", owner: "Yuki Tanaka", outcomeLinked: true, shipped: true },
    ],
  },
  {
    id: "p3",
    name: "Revenue Pod",
    owner: "Sarah Chen",
    initiatives: [
      { id: "i5", name: "Enterprise pricing realignment", lastDemoDate: "2026-02-06", sliceDeadline: "2026-02-16", owner: "Sarah Chen", outcomeLinked: true, shipped: false },
      { id: "i6", name: "Contract automation", sliceDeadline: "2026-02-25", owner: "Raj Mehta", outcomeLinked: false, shipped: false },
    ],
  },
];

export const closedDecisions: ClosedDecision[] = [
  {
    id: "cd1",
    decisionId: "d-old-1",
    title: "Reduce trial-to-paid friction",
    expectedOutcome: "Increase trial conversion from 12% to 20%",
    actualResult: "Conversion reached 18.4% — partial success",
    segmentShift: "SMB conversion +8pts, Enterprise flat",
    notes: "Checkout redesign had largest impact. Credit card requirement removal was key lever.",
    closedDate: "2026-01-20",
  },
  {
    id: "cd2",
    decisionId: "d-old-2",
    title: "Restructure CS team by segment",
    expectedOutcome: "Improve CSAT by 10pts across all segments",
    actualResult: "Enterprise CSAT +12pts, SMB +4pts",
    agentImpact: "Agent specialization reduced escalation rate by 35%",
    notes: "SMB segment needs dedicated onboarding support. Enterprise restructure exceeded targets.",
    closedDate: "2026-01-15",
  },
];
