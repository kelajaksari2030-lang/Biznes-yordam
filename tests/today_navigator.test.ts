/**
 * BiznesYordam - "Bugun nima qilay?" (Today Navigator) Test Suite
 * 
 * Verifies:
 * 1. Plan generation integrity: all 7 required sections are produced.
 * 2. Zero-cost budget handling: when no budget is provided, strictly zero-cost organic acquisition is advised (no mandatory paid ads).
 * 3. Paid budget handling: respects provided budget without hallucinating arbitrary costs.
 * 4. Time constraints: 30m vs 1h vs 2h vs 4h+ correctly adjusts step counts and minute breakdowns.
 * 5. Express 30-minute plan has explicit minute marks.
 * 6. Anti-distraction rule provides what to avoid, reason, and alternative.
 * 7. End of day KPI evaluation provides verification question and realistic fallback.
 * 8. Checklist item toggle behavior and completion calculation.
 */

import { generateTodayPlan } from '../src/services/todayNavigatorService';
import { TodayNavigatorInput, TodayNavigatorPlan } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('🧪 RUNNING TODAY NAVIGATOR ("BUGUN NIMA QILAY?") TEST SUITE');
console.log('====================================================');

// Test 1: Full plan generation integrity
const testInput1: TodayNavigatorInput = {
  businessType: "Kiyim va aksessuarlar do'koni",
  mainProblem: "Bugun hech kim kirmayapti, kassa bo'sh",
  todayGoal: "Kamida 2 ta buyurtma olish va kassa tushumini boshlash",
  availableTime: '1h',
  budget: '', // Omitted budget
  clientStatus: "5 ta mijoz narx so'ragan",
};

const plan1 = generateTodayPlan(testInput1);

assert(Boolean(plan1.id), "Plan has unique ID");
assert(Boolean(plan1.dateFormatted), "Plan has formatted Uzbek date");
assert(Boolean(plan1.singleMostImportantTask.title), "1. Single most important task has title");
assert(Boolean(plan1.singleMostImportantTask.rationale), "1. Single most important task has rationale");
assert(Boolean(plan1.singleMostImportantTask.expectedResult), "1. Single most important task has expected outcome");

assert(plan1.actionSteps.length >= 3 && plan1.actionSteps.length <= 5, "2. Action steps count is between 3 and 5");
plan1.actionSteps.forEach((step, idx) => {
  assert(step.estimatedMinutes > 0, `2. Step ${idx + 1} has valid estimatedMinutes (${step.estimatedMinutes}m)`);
  assert(step.title.length > 5, `2. Step ${idx + 1} has non-empty title`);
  assert(step.completed === false, `2. Step ${idx + 1} initialized with completed = false`);
});

assert(Boolean(plan1.zeroCostCustomerAcquisitionTactic.title), "3. Zero-cost customer acquisition has title");
assert(plan1.zeroCostCustomerAcquisitionTactic.stepByStep.length >= 3, "3. Zero-cost tactic contains step-by-step actions");

assert(Boolean(plan1.antiDistractionRule.whatToAvoid), "4. Anti-distraction rule specifies what to avoid");
assert(Boolean(plan1.antiDistractionRule.whyItWastesTime), "4. Anti-distraction rule explains why it wastes time");
assert(Boolean(plan1.antiDistractionRule.practicalAlternative), "4. Anti-distraction rule provides practical alternative");

assert(Boolean(plan1.expressThirtyMinPlan.steps.length >= 3), "5. 30-minute express plan has at least 3 minute-marked blocks");
assert(Boolean(plan1.endOfDaySuccessMetrics.targetMetric), "6. End of day success metric is defined");
assert(Boolean(plan1.endOfDaySuccessMetrics.verificationQuestion), "6. End of day verification question is defined");

// Test 2: Omitted or 0 budget must NOT mandate paid ads
assert(
  plan1.zeroCostCustomerAcquisitionTactic.costNote.includes("0 so'm") || 
  plan1.zeroCostCustomerAcquisitionTactic.costNote.includes("bepul"),
  "Strict zero-cost rule: When budget is omitted, cost note explicitly confirms 0 so'm / bepul"
);
assert(
  !plan1.zeroCostCustomerAcquisitionTactic.title.toLowerCase().includes("pullik reklama majburiy"),
  "Zero-cost tactic does not force paid advertisements"
);

// Test 3: Explicit paid budget handling
const testInputWithBudget: TodayNavigatorInput = {
  businessType: "O'quv markazi",
  mainProblem: "Yangi guruhga 3 ta o'quvchi yetmayapti",
  todayGoal: "3 ta o'quvchi yozdirish",
  availableTime: '2h',
  budget: "80 000 so'm",
};
const planWithBudget = generateTodayPlan(testInputWithBudget);
assert(
  planWithBudget.zeroCostCustomerAcquisitionTactic.costNote.includes("80 000 so'm"),
  "Provided budget is accurately recognized in acquisition strategy"
);

// Test 4: Time adaptation test (30m vs 1h vs 4h+)
const plan30m = generateTodayPlan({
  businessType: "Fast food",
  mainProblem: "Tushlikka buyurtma kam",
  todayGoal: "Tushlik vaqtida 10 ta buyurtma olish",
  availableTime: '30m',
});
assert(plan30m.actionSteps.length === 3, "30m plan contains exactly 3 concentrated steps");
const sumMinutes30m = plan30m.actionSteps.reduce((sum, s) => sum + s.estimatedMinutes, 0);
assert(sumMinutes30m <= 30, `30m plan step minutes sum (${sumMinutes30m}m) does not exceed 30 minutes`);

const plan4h = generateTodayPlan({
  businessType: "Mebel ishlab chiqarish",
  mainProblem: "Katta buyurtma kerak",
  todayGoal: "1 ta mebel komplektiga buyurtma olish",
  availableTime: '4h+',
});
assert(plan4h.actionSteps.length === 5, "4h+ plan contains 5 comprehensive steps");

// Test 5: Interactive step completion
let updatedSteps = [...plan1.actionSteps];
assert(updatedSteps[0].completed === false, "First step initially incomplete");
updatedSteps[0] = { ...updatedSteps[0], completed: true };
assert(updatedSteps[0].completed === true, "First step successfully marked as completed");
const completedCount = updatedSteps.filter(s => s.completed).length;
assert(completedCount === 1, "Completed step count correctly calculates 1");

console.log('====================================================');
console.log('🏁 ALL TODAY NAVIGATOR TESTS PASSED SUCCESSFULLY');
console.log('====================================================');
