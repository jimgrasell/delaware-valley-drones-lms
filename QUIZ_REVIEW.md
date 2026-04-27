# Quiz Question Bank Review

Review of `Part_107_Practice_Questions_Bank.txt` (142 questions) against current 14 CFR Part 107 (post April 2021 final rule) and the FAA Airman Certification Standards for Remote Pilot — sUAS (FAA-S-ACS-10A).

Reviewer: Claude Opus 4.7. Confidence: high on regulatory items, medium on FAA-published sample-question wording, low on sectional-chart-specific questions where I can't see the chart figure.

Each item below references the question number from the source file. The student-facing chapter that hosts the question depends on the round-robin distribution in `loadQuizQuestions.ts`.

---

## 🔴 Likely wrong — fix before next student takes the quiz

### Q9 — Night Operations Lighting (explanation outdated)

The marked answer (anti-collision lights) is correct. The **explanation** is wrong:

> "A waiver is required for most night flights under Part 107."

This is pre-April-2021 rule. The Operations Over People final rule (published Jan 2021, effective Apr 2021) **eliminated the waiver requirement for night ops**. Pilots now need (1) anti-collision lights visible 3 SM, and (2) completion of updated initial test or recurrent training that covers night operations. Q30 already correctly reflects this.

**Fix:** Strike the waiver sentence; replace with reference to the post-April-2021 rule.

---

### Q27 — Maximum Airspeed (wrong term)

> "Unless otherwise authorized, what is the maximum airspeed at which a person may operate an sUAS below 400 feet?"

Part 107 limits **groundspeed**, not airspeed. §107.51(b) caps groundspeed at 87 knots / 100 mph. Airspeed is unrestricted. Q13 uses the correct term ("groundspeed"); Q27 doesn't.

**Fix:** Change "airspeed" to "groundspeed" in the question stem. Update citation in explanation from §107.19(d) to §107.51(b).

---

### Q54 — METAR KMDW Interpretation (BKN ≠ overcast)

Marked answer: "Sky 700 feet **overcast**, visibility 1-1/2SM, rain"

The METAR contains `BKN007 OVC015`. BKN = broken (5/8–7/8 cover); OVC = overcast (8/8). The 700 ft layer is **broken**; the 1500 ft layer is overcast. Calling BKN007 "overcast" is wrong terminology and the actual FAA exam tests this distinction.

**Fix:** Reword answer C to "Sky 700 feet broken, 1500 feet overcast, visibility 1-1/2SM, light rain" (matches the FAA's published sample wording).

---

### Q79 — Uphill Terrain Launch Performance (answer is backwards)

Marked answer C: "Decreases launch distances."
Explanation: "Uphill slopes reduce the effective ground speed needed for takeoff."

Both are wrong. For a fixed-wing sUAS, **uphill terrain INCREASES the launch distance required** — the aircraft must overcome a gravity vector during the takeoff roll, slowing acceleration. Downhill takeoffs are shorter. The reasoning in the explanation ("reduces effective ground speed") is also incorrect — aircraft need a specific *air*speed for liftoff, regardless of slope.

**Fix:** Mark option A (Increases launch distance) as correct. Rewrite explanation to: "Uphill slope adds a gravity component opposing acceleration, lengthening the takeoff roll. This combines with high weight, high density altitude, and unfavorable winds as factors that degrade launch performance."

---

### Q136 — Operations Over People (waiver claim is wrong)

> "Which operations over people require an FAA waiver under Part 107?"
> Marked answer: "Category 2, 3, and 4 operations."

This is wrong as written. Under §107.105–§107.140 (current rule, effective March 2021):
- **Cat 1** — no FAA approval needed if aircraft <0.55 lb and meets injury thresholds
- **Cat 2** — needs Declaration of Compliance from manufacturer; no waiver
- **Cat 3** — needs Declaration of Compliance + operational restrictions; no waiver
- **Cat 4** — needs an **airworthiness certificate**, not a waiver

Waivers (§107.205) are only required for ops over people that don't fit any category, or for operations otherwise restricted by Subpart B.

**Fix:** Either rewrite the question to ask about which category requires an *airworthiness certificate* (answer: Cat 4, see Q19), or rewrite the answer to: "Operations over people that don't meet any of the four category requirements require a waiver under §107.205." The current wording will teach students something the FAA exam will mark wrong.

---

## 🟡 Questionable / imprecise — review and refine

### Q2 — Registration <0.55 lb (Part 48 vs Part 107 conflict)

The marked answer ("less than 0.55 lb is exempt") matches the FAA's published Part 48 sample answer, but **under Part 107, all aircraft must be registered regardless of weight**. The 0.55 lb exemption applies to recreational flyers under 49 USC §44809, not Part 107 commercial operators. Many students miss this.

**Suggested fix:** Add to explanation: "Note: this Part 48 exemption applies to recreational flyers only. Under Part 107, aircraft of any weight must be registered."

---

### Q37 — Restricted Airspace Information Source

Marked answer: "Charts Supplements U.S."

The most authoritative source for SUA times/altitudes/controlling agency is the **special-use airspace box on the sectional chart margin**, with full details in **FAA Order JO 7400.10** and the AIM Chapter 3. The Chart Supplements covers airport-related info, not SUA. FAA materials sometimes accept Chart Supplements as a partial source, so this is defensible — but worth verifying against the current FAA sample-question key.

---

### Q77 — Range and Economy → "Specific Endurance"

Terminologically, **specific range** (NM per unit fuel) is the metric for range economy; **specific endurance** (hours per unit fuel) is the metric for time aloft. The FAA's published sample uses "specific endurance" as the answer here, so the question matches the FAA — but the explanation's claim that this optimizes range is conceptually wrong. Consider rewriting the explanation to acknowledge the FAA's loose use of the term.

---

### Q140 — Remote ID Broadcast Content (two answers are equivalent)

- B) Aircraft ID, location, altitude, and control station location
- C) [CORRECT] Aircraft location, altitude, control station location, and unique identifier

"Aircraft ID" and "unique identifier" are the same Remote ID broadcast field per §89.305. Both options describe a correct broadcast. The distractor needs to be actually wrong — e.g. swap in "speed" or "battery state" or omit one of the four required fields.

---

### Q124 — Spectral Analyzer for RFI

Marked answer ("monitor with a spectral analyzer") is uncommon advice for typical sUAS operators. The FAA's published guidance generally emphasizes site survey, frequency awareness, and avoiding congested RF environments. Spectral analyzers exist but aren't standard PIC equipment. Worth checking against the actual FAA sample question wording — the bank may be paraphrasing.

---

## 🟡 Citation / regulation-number errors

These don't break the quiz, but the explanations cite the wrong CFR section. Students who follow up will land on the wrong rule.

| Q | Topic | Cited | Should be |
|---|-------|-------|-----------|
| Q6 | Operate so as not to endanger life/property | §107.15(a) | §107.23(a) — careless or reckless operation |
| Q8 | 8-hour alcohol rule | §107.21(a)(3) | §107.27 (which references §91.17(a)(1)) |
| Q13 | Max groundspeed 87 kt | §107.19(d) | §107.51(b) |
| Q14 | 400 ft above structure | §107.19 / §107.19(d) | §107.51(b) |
| Q17 | Chemical test refusal | §107.59 | §107.57 |
| Q21 | Moving vehicle ops | §107.21(b) | §107.25 |
| Q24 | One sUAS per PIC | §107.31 | §107.35 |
| Q27 | Max speed (also term issue, see 🔴) | §107.19(d) | §107.51(b) |
| Q28 | Emergency clearance deviation | §107.43 | §107.21(b) |
| Q41 | 3 SM visibility | §107.31 | §107.51(c) |
| Q60 | Cloud clearance | §107.31(b)(2) | §107.51(d) |
| Q116 | Moving vehicle ops | §107.21(b) | §107.25 |
| Q138 | 3 SM visibility | §107.31 | §107.51(c) |

---

## 🟡 ACS code mismatches

ACS codes are used by the bank's `--dry-run` distribution and could surface in future review tooling. Several physiology / ADM / emergency-procedure questions are tagged with airport-ops codes:

- Q107 (medication) → labeled UA.V.B.K2; should be UA.V.E (physiology)
- Q108 (anti-authority) → UA.V.B.K2; should be UA.V.D.K4
- Q109 (fatigue types) → UA.V.B.K2; should be UA.V.E.K5
- Q110 (pilot fitness) → UA.V.B.K2; should be UA.V.E
- Q115 (lithium battery) → UA.V.B.K1; should be UA.V.F (maintenance) or UA.V.C (emergency)
- Q120, Q121, Q130 (flyaway) → UA.V.B; should be UA.V.C (emergency procedures)
- Q124, Q125 (RFI / GPS loss) → UA.V.B.K1; should be UA.V.C
- Q127 (radio phraseology) → UA.V.B.K1; OK-ish, debatable
- Q128 (fatigue revisited) → UA.V.B.K2; should be UA.V.E.K5

Low impact for the live student experience, but if you ever surface ACS codes for review or weak-area drilling, these will misroute.

---

## 🟢 Duplicates and near-duplicates

With unlimited retakes and round-robin distribution by area, near-identical pairs can land in the same quiz. Consider deduplication or marking one as "alternate wording" to be excluded.

| Pair | Topic | Notes |
|------|-------|-------|
| Q15 / Q131 | "Upon FAA request, provide pilot certificate" | Identical except option B distractor |
| Q20 / Q129 | Remote ID failure → land ASAP | Identical answer + explanation |
| Q28 / Q133 | Emergency exception to ATC clearance | Same question, different wording |
| Q41 / Q138 | 3 SM minimum visibility | Same regulatory point |
| Q44 / Q49 | Hold short markings | Same answer twice |
| Q53 / Q105 | Systematic traffic scanning | Identical |
| Q104 / Q128 | Fatigue = impaired state | Identical |
| Q111 / Q113 | Establish maintenance protocol when manufacturer doesn't | Identical |

---

## 🟢 Source-file consistency

- **Mixed `[CORRECT]` vs `[[CORRECT]` markers.** Q1–Q28 use single brackets; Q29–Q142 use double brackets. The parser handles both (`loadQuizQuestions.ts:132,134`), so this is cosmetic only — but worth normalizing in the source file. Recommend `sed -i 's/\[\[CORRECT\]/[CORRECT]/g'` on the source.

- **Stale comment in `loadQuizQuestions.ts:230`:** "Pull a few from the end for Ch12/Ch13" — `MIXED_CHAPTERS` is actually `[1, 14]`. Comment lags the constant.

---

## ⚪ Sectional-chart-dependent questions

These are FAA-published sample questions tied to figures in **FAA-CT-8080-2H** (Airman Knowledge Testing Supplement, current ed. for 2026). Figure refs below were cross-checked against jrupprechtlaw.com's UAG-72 set, Chegg/Course Hero excerpts that quote the original FAA prompts, and the FAA's own remote-pilot study guide. The supplement is the same booklet handed out at the testing center.

**Verify the figure column matches what your students see** — if your course materials use different sectional excerpts than the supplement, the answers can disagree.

| Q | Title | Figure | Area | Source confidence |
|---|---|---|---|---|
| Q14 | Max altitude over SUX tower | 78 | near center | high |
| Q31 | Class B floor — Dallas Executive | 25 | 3 | high |
| Q32 | Class C shelf — Savannah | 23 | 3 | high |
| Q34 | Pueblo airport class | 26 | 4 | medium — figure not text-cited in FAA sample |
| Q35 | Fentress NALF airspace | 20 | 1 | high |
| Q36 | MTR VR1667 et al. | 59 | 2 | high |
| Q37 | R-2305 info source | 75 | 6 | high |
| Q38 | Devil's Lake West MOA active? | 21 | east of 2 | high |
| Q39 | NSA dashed magenta E of Pueblo | 26 | 4–5 | medium — figure inferred from region |
| Q40 | Indy 500 TFR | — | — | text-only, no figure |
| Q41 | Plantation (JYL) visibility | 23 | 4 | high |
| Q42 | Lake Drummond VFR check | 20 | 2 | high |
| Q44 | Hold short markings | — | — | text-only |
| Q49 | Runway clear at towered airport | — | — | text-only |
| Q81 | Cooperstown left downwind RWY 13 | 26 | 2 | high |
| Q83 | Airport at 47°40′N 101°26′W | 21 | (Garrison) | high |
| Q84 | Coeur D'Alene CTAF | 22 | 2 | high |
| Q85 | Hertford highest obstacle | 20 | 4 | high |
| Q86 | Tower near JMS at 46.9N 98.6W | 26 | 4 | high |
| Q87 | Tri-County parachute ops | 24 | 3 | high |
| Q88 | SUX airspace class | 78 | center | high |
| Q89 | Card Airport type | 24 | 6 | high |
| Q90 | Balloon SE of ECG | 20 | 3 | high |
| Q91 | Latitude-line meaning | 26 | 4 | medium |
| Q92 | Most comprehensive airport info | — | — | text-only |

The risk is mostly that the FAA reissues a sectional figure with different airspace or obstacles in the same area, flipping the correct answer years after the question was written. The supplement is reissued periodically (currently FAA-CT-8080-2H, with revised editions appearing every few years); make sure the questions and the figure edition you cite to students stay aligned.

Bonus mapping (not in the 25 above but useful): Q43 (CHECK NOTAMs for unmarked balloon CAUTION) → Figure 20, Area 5. Q82 (Minot tower frequency) → Figure 21, Area 1.

---

## Recommended fix priority

1. **Today, before next student attempt:** fix Q79, Q136, Q9 (explanation), Q54 (terminology), Q27 (term + citation). These are answer-level errors a student would notice and that conflict with what the actual FAA exam tests.
2. **This week:** fix the citation table — bulk find/replace in the source file, then `npm run quiz:load`.
3. **Whenever:** Q2 explanation note, Q140 distractor rewrite, Q37 verification, dedup pass on near-duplicates, normalize `[CORRECT]` markers.

After source edits: re-run `cd backend && DATABASE_URL='postgresql://...' npm run quiz:load` to push the corrections to production. The loader is idempotent (DELETE + INSERT per quiz), and student progress is keyed to QuizAttempt rows, so re-loading questions doesn't disturb existing attempt history.
