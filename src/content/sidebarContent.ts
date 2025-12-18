/**
 * Sidebar Content - Structured content for educational panels
 * Based on vascular_cpt_ui_content_v1.md
 */

export interface SidebarCard {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  bullets?: string[];
  table?: {
    headers: string[];
    rows: string[][];
  };
  examples?: { label: string; content: string }[];
  footer?: string;
  codeRef?: string[];
}

export interface SidebarTab {
  id: string;
  label: string;
  icon: string;
  cards: SidebarCard[];
}

export const SIDEBAR_CONTENT: SidebarTab[] = [
  {
    id: 'modifiers',
    label: 'Modifiers',
    icon: 'tag',
    cards: [
      {
        id: 'big_four_modifiers',
        title: 'The Big 4 Modifiers',
        subtitle: 'The most common ways vascular surgeons legitimately avoid bundled work.',
        content: '',
        table: {
          headers: ['Modifier', 'Name', 'When to Use'],
          rows: [
            ['-57', 'Decision for Surgery', 'E/M on day of or day before 90-day global surgery when you make the operative decision'],
            ['-24', 'Unrelated E/M in Global', 'E/M during global period when diagnosis is unrelated to the surgery'],
            ['-58', 'Staged / More Extensive', 'Planned/staged procedure or progression of disease; pays 100% and resets global'],
            ['-25', 'Significant E/M + Minor', 'Separate, significant E/M on same day as 0 or 10-day global procedure'],
          ],
        },
        footer: '-57 and -58 apply only to 90-day global procedures; -25 applies only to 0/10-day global procedures.',
      },
      {
        id: 'modifier_57',
        title: "Modifier -57 — Don't Donate the Consult",
        subtitle: 'Decision for Surgery',
        content: 'Day of or day before a 90-day global procedure when you make the operative decision.',
        bullets: [
          'Ruptured/symptomatic AAA → consult → emergent EVAR/open repair',
          'Acute limb ischemia → consult → thrombectomy or bypass',
          'Symptomatic carotid stenosis → consult → CEA next morning',
        ],
        examples: [
          {
            label: 'Documentation Template',
            content: '"Given [findings], I have determined that urgent/emergent operative intervention is indicated. Risks, benefits, and alternatives were discussed. The patient consents to proceed with [procedure]."',
          },
        ],
        footer: 'Missing -57 on consult day → E/M gets bundled into the operation at $0.',
      },
      {
        id: 'modifier_24',
        title: "Modifier -24 — Global Period ≠ No Clinic Billing",
        subtitle: 'Unrelated E/M During Global',
        content: 'Post-op visit during the global period for a different diagnosis requiring separate E/M-level workup.',
        examples: [
          {
            label: 'Vascular Example',
            content: 'Patient is 3 weeks post fem-pop bypass (in 90-day global). Presents with new TIA symptoms. You perform complete neurologic assessment + order carotid duplex. Bill: 99214-24 with carotid/TIA ICD-10 (not PAD diagnosis).',
          },
        ],
        bullets: [
          '❌ Do NOT use for routine wound checks or expected post-op pain',
          '❌ Different anatomic site alone is NOT sufficient',
          '✓ Must document the unrelated problem thoroughly',
        ],
      },
      {
        id: 'modifier_58_vs_78',
        title: 'Modifier -58 vs -78',
        subtitle: 'Staged/Progression vs Complication',
        content: 'Critical distinction for return-to-OR scenarios.',
        table: {
          headers: ['Modifier', 'Situation', 'Payment', 'Global Period'],
          rows: [
            ['-58', 'Staged, planned, or progression', '100%', 'Resets to new 90-day'],
            ['-78', 'Complication requiring return', '~70%', 'Does NOT reset'],
          ],
        },
        bullets: [
          '-58: Inflow-first strategy, thrombolysis → intervention, fasciotomy → closure, disease progression',
          '-78: Bleeding re-exploration, graft thrombosis, wound dehiscence',
        ],
        footer: 'Difference: ~6 wRVU per case when incorrectly coded.',
      },
      {
        id: 'modifier_25',
        title: 'Modifier -25 — E/M + Minor Procedure',
        subtitle: 'Same-Day Visit with 0/10-Day Global Procedure',
        content: 'When you performed a significant, separately identifiable E/M service.',
        bullets: [
          'The E/M must be significant — not just "saw the patient before the procedure"',
          'The E/M must be documented separately from the procedure note',
          'New patient vein consultation + same-day sclerotherapy',
          'Wound debridement + comprehensive vascular assessment',
        ],
        footer: '"Patient here for scheduled sclerotherapy" does NOT support -25.',
      },
      {
        id: 'modifier_59_x',
        title: 'Modifier -59 / X{S,E,U,P}',
        subtitle: 'Distinct Services That Typically Bundle',
        content: 'Two procedures that normally bundle together, but are truly distinct in your case.',
        table: {
          headers: ['Modifier', 'Meaning', 'Vascular Example'],
          rows: [
            ['XS', 'Separate Structure', 'Left fem-pop bypass + right iliac stent'],
            ['XE', 'Separate Encounter', 'Morning diagnostic angio + afternoon intervention'],
            ['XU', 'Unusual Non-Overlapping', 'Rarely used in vascular'],
            ['XP', 'Separate Practitioner', 'Different surgeon performs second procedure'],
          ],
        },
        footer: 'XS is most common for vascular. Use -59 as fallback if payer rejects X modifiers.',
      },
      {
        id: 'modifier_22',
        title: 'Modifier -22 — The Hard Case',
        subtitle: 'Increased Procedural Services',
        content: 'Work/time significantly exceeds typical (generally >25% increase) due to patient-specific factors.',
        bullets: [
          'Redo CEA with hostile scarring from prior surgery/radiation',
          'EVAR in morbidly obese patient with severe access vessel disease',
          'Bypass with anomalous anatomy requiring extensive dissection',
        ],
        examples: [
          {
            label: 'Required Documentation',
            content: '1) WHAT made it harder (specific findings), 2) HOW MUCH additional work (time/complexity compared to typical)',
          },
        ],
        footer: 'Submit operative report with claim. Typical additional payment: 20-30% above base.',
      },
    ],
  },
  {
    id: 'endo_addons',
    label: 'Endo Add-Ons',
    icon: 'plus-circle',
    cards: [
      {
        id: 'ivus',
        title: 'IVUS — Intravascular Ultrasound',
        subtitle: '37252 (initial) / +37253 (additional)',
        content: 'Use IVUS to size vessel, confirm stent apposition/expansion, or assess lesion characteristics.',
        table: {
          headers: ['Code', 'Description', 'wRVU'],
          rows: [
            ['37252', 'IVUS, initial noncoronary vessel', '1.80'],
            ['+37253', 'IVUS, each additional vessel', '1.40'],
          ],
        },
        examples: [
          {
            label: 'Documentation',
            content: '"IVUS performed in the [vessel]. Vessel diameter measured at X.X mm. Following stent deployment, IVUS confirmed adequate expansion and wall apposition."',
          },
        ],
        footer: 'IVUS is separately billable — NOT bundled into LER or dialysis codes.',
        codeRef: ['37252', '37253'],
      },
      {
        id: 'selective_cath',
        title: 'Selective Catheter Placement',
        subtitle: 'Bill the Drive, Not Just the Angio',
        content: 'Code how far you advanced selectively to reach the target vessel.',
        table: {
          headers: ['Order', 'Code', 'wRVU', 'Examples'],
          rows: [
            ['1st Order', '36245', '3.52', 'Aorta → Common iliac; Aorta → Renal'],
            ['2nd Order', '36246', '4.48', 'CIA → EIA; Aorta → SMA branch'],
            ['3rd Order+', '36247', '5.05', 'EIA → CFA → SFA/Pop; Into tibials'],
            ['Add\'l branch', '+36248', '1.50', 'Second 2nd/3rd order, same family'],
          ],
        },
        bullets: [
          '⚠️ BUNDLED INTO most LER intervention codes',
          'Bill separately ONLY for diagnostic-only or separate vascular territory',
        ],
        codeRef: ['36245', '36246', '36247', '36248'],
      },
      {
        id: 'us_guidance',
        title: 'US Guidance for Access (76937)',
        subtitle: 'Documentation Matters — 4 Required Elements',
        content: 'wRVU: 0.30 — small but adds up with consistent capture.',
        table: {
          headers: ['Element', 'What to Document'],
          rows: [
            ['1. Real-time visualization', '"Under real-time ultrasound guidance..."'],
            ['2. Evaluation of access sites', '"...CFA evaluated and found suitable, no significant calcification"'],
            ['3. Vessel patency', '"Vessel patency confirmed with color Doppler"'],
            ['4. Permanent image', '"Representative images saved to medical record"'],
          ],
        },
        footer: '❌ Missing saved image = cannot bill',
        codeRef: ['76937'],
      },
      {
        id: 'ivl_shockwave',
        title: 'Intravascular Lithotripsy (IVL)',
        subtitle: 'Treating Calcified Lesions',
        content: 'IVL (Shockwave) for heavily calcified plaque prior to definitive therapy.',
        table: {
          headers: ['Code', 'Description', 'wRVU', 'Year'],
          rows: [
            ['+37279', 'IVL, femoral/popliteal territory', '4.00', '2026 NEW'],
          ],
        },
        examples: [
          {
            label: 'Documentation',
            content: '"IVL performed using Shockwave catheter for severe circumferential calcification. [X] cycles delivered. Post-IVL showed improved vessel compliance."',
          },
        ],
        codeRef: ['37279'],
      },
    ],
  },
  {
    id: 'dialysis',
    label: 'Dialysis Access',
    icon: 'activity',
    cards: [
      {
        id: 'dialysis_hierarchy',
        title: 'Dialysis Circuit Code Hierarchy',
        subtitle: 'Mutually Exclusive Base Codes',
        content: 'Choose the SINGLE highest-complexity base code that reflects what you performed.',
        table: {
          headers: ['Code', 'Description', 'wRVU'],
          rows: [
            ['36901', 'Diagnostic fistulogram only', '3.36'],
            ['36902', 'Fistulogram + peripheral angioplasty', '4.83'],
            ['36903', 'Fistulogram + peripheral stent', '6.39'],
            ['36904', 'Thrombectomy only', '7.50'],
            ['36905', 'Thrombectomy + peripheral angioplasty', '9.00'],
            ['36906', 'Thrombectomy + peripheral stent', '10.42'],
          ],
        },
        bullets: [
          'Add-ons: +36907 (central PTA, 3.00), +36908 (central stent, 4.25), +36909 (embolization, 1.75)',
          '❌ Never stack base codes — diagnostic is INCLUDED in intervention codes',
        ],
        codeRef: ['36901', '36902', '36903', '36904', '36905', '36906', '36907', '36908', '36909'],
      },
      {
        id: 'dialysis_globals',
        title: 'Dialysis Access Global Periods',
        subtitle: 'Interventional vs Surgical',
        content: 'Interventional codes (36901-36909) have 0-day globals. Surgical creation/revision codes have 90-day globals.',
        table: {
          headers: ['Code', 'Description', 'Global', 'wRVU'],
          rows: [
            ['36821', 'AVF, direct (Brescia-Cimino)', '90', '11.61'],
            ['36818-20', 'AVF, vein transposition', '90', '12.08-12.96'],
            ['36830', 'AV graft creation (PTFE)', '90', '11.50'],
            ['36831', 'Open AV thrombectomy', '90', '7.43'],
            ['36832', 'Open AV revision (no declot)', '90', '10.00'],
            ['36833', 'Open AV revision + thrombectomy', '90', '11.50'],
          ],
        },
        footer: 'You CAN bill fistulogram during 90-day global IF it\'s for a separate problem (non-maturation workup, etc.)',
      },
      {
        id: 'dialysis_scenarios',
        title: 'Dialysis Coding Scenarios',
        subtitle: 'Common Case Examples',
        content: '',
        examples: [
          {
            label: 'Scenario 1: Simple Fistulogram',
            content: 'Sluggish flow, fistulogram shows no stenosis.\n→ 36901 = 3.36 wRVU',
          },
          {
            label: 'Scenario 2: Fistulogram + PTA',
            content: '80% venous anastomosis stenosis treated with PTA.\n→ 36902 = 4.83 wRVU',
          },
          {
            label: 'Scenario 3: Thrombosed Graft, Full Intervention',
            content: 'Declot + peripheral stent + central PTA + coil embolization.\n→ 36906 + 36907 + 36909 = 15.17 wRVU',
          },
        ],
      },
    ],
  },
  {
    id: 'imaging',
    label: 'Imaging / S&I',
    icon: 'image',
    cards: [
      {
        id: 'vascular_lab',
        title: 'Vascular Lab Interpretation',
        subtitle: 'Consistent Productivity',
        content: 'If credentialed and performing formal interpretations, reading your own studies generates consistent wRVU credit.',
        table: {
          headers: ['Code', 'Description', 'wRVU'],
          rows: [
            ['93880', 'Duplex carotid, complete bilateral', '1.10'],
            ['93925', 'Duplex lower ext arterial, bilateral', '0.90'],
            ['93970', 'Duplex venous, complete bilateral', '0.80'],
            ['93978', 'Duplex aorta/IVC/iliac or bypass', '0.75'],
          ],
        },
        bullets: [
          'Requires formal credentialing and written interpretation with signature',
          'Cannot bill if separate radiologist interprets same study',
        ],
      },
      {
        id: 'imaging_bundling',
        title: 'Imaging S&I — 2026 Changes',
        subtitle: 'Bundling Awareness',
        content: 'Many S&I codes are being bundled into base intervention codes in 2026.',
        table: {
          headers: ['Code', 'Description', '2025', '2026'],
          rows: [
            ['75956', 'TEVAR imaging, covering LSA', 'Separate', 'DELETED'],
            ['75957', 'TEVAR imaging, not covering LSA', 'Separate', 'DELETED'],
            ['75958', 'TEVAR proximal extension imaging', 'Separate', 'DELETED'],
            ['75959', 'TEVAR distal extension imaging', 'Separate', 'DELETED'],
          ],
        },
        footer: 'LER codes have ALWAYS included imaging S&I — no separate billing.',
      },
    ],
  },
  {
    id: 'contract',
    label: 'Institutional wRVU',
    icon: 'building',
    cards: [
      {
        id: 'wrvu_standard_values',
        title: 'The Standard "Hard" Numbers',
        subtitle: 'Your National Baseline',
        content: 'For 95% of your work, the wRVU value is fixed nationally by CMS. This is your baseline — variability comes from HOW your institution counts them.',
        table: {
          headers: ['Code', 'Description', '2025 wRVU'],
          rows: [
            ['99204', 'New Pt Visit (Level 4)', '2.60'],
            ['99214', 'Est Pt Visit (Level 4)', '1.92'],
            ['35301', 'Carotid Endarterectomy', '20.50'],
            ['34705', 'EVAR (Infrarenal)', '26.10'],
            ['36821', 'AV Fistula Creation', '10.65'],
            ['37224', 'Fem/Pop Angioplasty', '8.04'],
            ['37226', 'Fem/Pop Stent', '9.65'],
          ],
        },
        footer: 'You will NOT see different numbers unless one of three variables is at play (see below).',
      },
      {
        id: 'vintage_year_trap',
        title: 'Variable #1: The "Vintage Year" Trap',
        subtitle: 'Variability: ±10%',
        content: 'Hospitals don\'t make up wRVU values, but they DO choose which year of the Medicare rulebook to use.',
        bullets: [
          'The Trap: Many hospitals freeze their wRVU schedule to the year you signed your contract (e.g., "2023 Medicare Physician Fee Schedule")',
          'E/M Codes: In 2021, CMS drastically increased office visit values (99204 went from ~2.4 to 2.6). If paid on "2020 Schedule," you lose ~10% on every clinic patient.',
          'Vascular Codes: Some endovascular codes get cut (devalued) over time — an older schedule might actually benefit you here.',
        ],
        examples: [
          {
            label: 'Question to Ask',
            content: '"Does my wRVU accumulation follow the current calendar year CMS schedule, or is it frozen to a specific year?"',
          },
        ],
      },
      {
        id: 'shadow_billing',
        title: 'Variable #2: The "HMO Shadow" Calculation',
        subtitle: 'Variability: 20-30% — THE BIGGEST FACTOR',
        content: 'Major hospitals have huge HMO/IPA contracts. When you see a capitated patient, the hospital gets a flat monthly fee — you technically generate $0.00 billable revenue.',
        table: {
          headers: ['Contract Type', 'How It Works', 'Your Credit'],
          rows: [
            ['Good Contract', 'Assigns "Shadow wRVU" identical to Medicare standard', 'Full 2.60 wRVU'],
            ['Bad Contract', 'Applies discount factor to shadow claims', 'Maybe 1.80 wRVU'],
            ['Worst Contract', 'Doesn\'t track shadow claims accurately', 'Maybe 0 wRVU'],
          ],
        },
        bullets: [
          'The Problem: You could be doing "8,000 wRVUs" of actual work but only showing "6,000 Billable wRVUs" on your report',
          'This is the single biggest factor in California and other HMO-heavy markets',
        ],
        examples: [
          {
            label: 'Question to Ask',
            content: '"How are capitated/HMO encounters credited? Do I receive shadow wRVU credit at the full Medicare rate?"',
          },
        ],
      },
      {
        id: 'gpci_multiplier',
        title: 'Variable #3: The GPCI Multiplier',
        subtitle: 'Dollar Variability (Not wRVU Points)',
        content: 'The wRVU points don\'t change by geography, but the PAYMENT does.',
        bullets: [
          'Formula: (Work RVU × Work GPCI) × Conversion Factor',
          'Los Angeles has high GPCI (>1.05 for work) — a 2.60 wRVU visit effectively pays as if it were ~2.75 wRVUs worth of dollars',
          'Productivity targets (the "8,000 number") are usually based on Raw wRVU (2.60)',
          'If your contract pays based on Adjusted wRVUs (2.75), you hit financial bonuses faster',
        ],
        footer: 'It\'s rare for productivity targets to use GPCI-adjusted numbers — but always verify.',
      },
      {
        id: 'unlisted_teaching',
        title: 'Institutional Variability: Unlisted & Teaching',
        subtitle: 'Where Hospitals May Be Higher Than Average',
        content: 'Two areas where your institution might actually credit MORE than the national average.',
        table: {
          headers: ['Category', 'National Avg', 'Hospital Policy Example'],
          rows: [
            ['Unlisted Codes (37799)', '0 wRVU (until manual review)', '15 wRVU flat for unlisted aortic work'],
            ['Teaching Credit', '0 wRVU', '4 hrs staffing = 5 wRVU'],
          ],
        },
        bullets: [
          'Unlisted Codes: Vascular surgeons do procedures without specific codes (complex venous recanalization, etc.). Ask how 37799 is valued.',
          'Teaching Credit: Do you get wRVU credit for hours spent staffing residents in clinic? Academic centers often have explicit policies.',
        ],
      },
      {
        id: 'contract_checklist',
        title: 'Contract Review Checklist',
        subtitle: 'What to Look For in Your Spreadsheet',
        content: 'Final Verdict: Do NOT expect CPT wRVU values to be different. Expect the METHOD of counting them to be the main variable.',
        bullets: [
          '☐ Which CMS fee schedule year is used? (Current vs frozen)',
          '☐ How are HMO/capitated visits credited? (Shadow wRVU policy)',
          '☐ Is GPCI applied to productivity targets or just compensation?',
          '☐ How are unlisted codes (37799) valued internally?',
          '☐ Is there teaching/supervision wRVU credit?',
        ],
        examples: [
          {
            label: 'The Bottom Line',
            content: 'Same procedures, same documentation, dramatically different productivity credit — all based on how your institution counts. Know your contract.',
          },
        ],
      },
    ],
  },
];

export function getTabById(tabId: string): SidebarTab | undefined {
  return SIDEBAR_CONTENT.find(tab => tab.id === tabId);
}

export function getCardById(cardId: string): SidebarCard | undefined {
  for (const tab of SIDEBAR_CONTENT) {
    const card = tab.cards.find(c => c.id === cardId);
    if (card) return card;
  }
  return undefined;
}
