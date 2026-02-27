/**
 * Proof panel UI: reason select, outcome input, prerequisites, add step.
 */

import {
  REASONS,
  resolveContext,
  verifyStep,
  statementToString,
  parseOutcomeStatement,
  type ProofStep,
} from '../proof.js';
import { state, proofSteps, pushLog, getPlaneStateSnapshot } from './state.js';

const PARSE_HINT =
  'Could not parse outcome. Use forms like: A ≠ B, C ∈ line AB, E = line AB ∩ line CD, Let M be midpoint of AB, ∠AMC = 90°, ∠AMC = ∠AMB, AB = AC, ΔAMB ≅ ΔAMC';

const LATEX_REPLACEMENTS: Record<string, string> = {
  ang: '∠',
  angle: '∠',
  triangle: 'Δ',
  tri: 'Δ',
  deg: '°',
  degree: '°',
  circ: '°',
  perp: '⊥',
  cong: '≅',
  equiv: '≡',
  cup: '∪',
  cap: '∩',
  in: '∈',
  neq: '≠',
  ne: '≠',
  exists: '∃',
  forall: '∀',
  cdot: '·',
  to: '→',
  rightarrow: '→',
  leftarrow: '←',
  leq: '≤',
  geq: '≥',
};

function applyLatexReplacement(input: HTMLInputElement): boolean {
  const val = input.value;
  const start = input.selectionStart ?? val.length;
  const before = val.slice(0, start);
  const lastBackslash = before.lastIndexOf('\\');
  if (lastBackslash === -1) return false;
  const word = before.slice(lastBackslash + 1);
  if (!/^[a-zA-Z]+$/.test(word)) return false;
  const symbol = LATEX_REPLACEMENTS[word];
  if (!symbol) return false;
  const newVal = val.slice(0, lastBackslash) + symbol + val.slice(start);
  input.value = newVal;
  const newPos = lastBackslash + symbol.length;
  input.setSelectionRange(newPos, newPos);
  return true;
}

export function renderProofSteps(): void {
  const el = document.getElementById('proof-steps');
  if (!el) return;
  el.textContent = '';
  proofSteps.forEach((step, i) => {
    const div = document.createElement('div');
    div.className = 'proof-step-item';
    div.setAttribute('role', 'listitem');
    const reasonName = REASONS.find((r) => r.id === step.reasonId)?.name ?? step.reasonId;
    const prereqStr =
      step.prerequisiteRefs.length > 0
        ? ` [from: ${step.prerequisiteRefs.map((r) => (r === 'given' ? 'Given' : `Step ${r}`)).join(', ')}]`
        : '';
    div.textContent = `${i + 1}. ${statementToString(step.outcome)} (${reasonName})${prereqStr}`;
    el.appendChild(div);
  });
  if (proofSteps.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'proof-step-item';
    empty.textContent = 'No steps yet. Add steps: outcome, reason, and prerequisites.';
    empty.setAttribute('aria-hidden', 'true');
    el.appendChild(empty);
  }
}

export function setProofStepMessage(msg: string, isError: boolean): void {
  const el = document.getElementById('proof-step-message');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('error', isError);
  el.classList.toggle('success', !isError);
}

export interface InitProofUIOptions {
  onStepAdded: () => void;
  updateLabelInput: () => void;
}

export function initProofUI(opts: InitProofUIOptions): void {
  const { onStepAdded, updateLabelInput } = opts;
  const toolsPanel = document.getElementById('tools-panel');
  const proofPanel = document.getElementById('proof-panel');
  const modeBtns = document.querySelectorAll('.sidebar-mode-btn');
  const reasonSelect = document.getElementById('proof-axiom-select') as HTMLSelectElement | null;
  const outcomeSection = document.getElementById('proof-outcome-section');
  const outcomeTextInput = document.getElementById('proof-outcome-text') as HTMLInputElement | null;
  const pointNamesDiv = document.getElementById('proof-point-names');
  const prereqsDiv = document.getElementById('proof-prereqs');
  const prereqGiven = document.getElementById('proof-prereq-given') as HTMLInputElement | null;
  const prereqStepsContainer = document.getElementById('proof-prereq-steps');
  const btnAdd = document.getElementById('btn-proof-add');

  const pointInputs = [0, 1, 2, 3, 4].map((i) =>
    document.getElementById(`proof-point-${i}`)
  ) as (HTMLInputElement | null)[];

  if (!proofPanel || !reasonSelect || !pointNamesDiv || !btnAdd) return;

  function addLatexKeydownListener(input: HTMLInputElement | null): void {
    if (!input) return;
    input.addEventListener('keydown', (e) => {
      if (e.key !== ' ') return;
      if (applyLatexReplacement(input)) e.preventDefault();
    });
  }
  addLatexKeydownListener(outcomeTextInput);
  pointInputs.forEach(addLatexKeydownListener);

  REASONS.forEach((r) => {
    const opt = document.createElement('option');
    opt.value = r.disabled ? '' : r.id;
    opt.textContent = r.name + (r.disabled ? ' (coming later)' : '');
    opt.disabled = !!r.disabled;
    reasonSelect.appendChild(opt);
  });

  function setMode(mode: 'tools' | 'proof'): void {
    const isProof = mode === 'proof';
    if (toolsPanel) toolsPanel.hidden = isProof;
    if (proofPanel) proofPanel.hidden = !isProof;
    modeBtns.forEach((btn) => {
      const m = btn.getAttribute('data-mode');
      const active = m === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    if (isProof) {
      renderProofSteps();
      updatePrereqCheckboxes();
      showPointInputsForReason();
    }
  }

  function updatePrereqCheckboxes(): void {
    if (!prereqStepsContainer) return;
    prereqStepsContainer.textContent = '';
    for (let i = 1; i <= proofSteps.length; i++) {
      const label = document.createElement('label');
      label.className = 'proof-prereq-label';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.step = String(i);
      label.appendChild(cb);
      label.append(` Step ${i}`);
      prereqStepsContainer.appendChild(label);
    }
  }

  function showPointInputsForReason(): void {
    const reasonId = reasonSelect?.value ?? '';
    if (outcomeSection) outcomeSection.hidden = false;
    if (pointNamesDiv) pointNamesDiv.hidden = true;
    if (prereqsDiv) prereqsDiv.hidden = !reasonId;
  }

  reasonSelect.addEventListener('change', showPointInputsForReason);

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      if (mode === 'tools' || mode === 'proof') setMode(mode);
    });
  });

  btnAdd.addEventListener('click', () => {
    const reasonId = reasonSelect?.value ?? '';
    if (!reasonId) {
      setProofStepMessage('Choose a reason first.', true);
      return;
    }
    const text = outcomeTextInput?.value?.trim() ?? '';
    const parsed = parseOutcomeStatement(text);
    if (!parsed) {
      setProofStepMessage(PARSE_HINT, true);
      return;
    }
    const outcome = parsed;
    const prerequisiteRefs: ('given' | number)[] = [];
    if (prereqGiven?.checked) prerequisiteRefs.push('given');
    prereqStepsContainer?.querySelectorAll('input[type="checkbox"][data-step]').forEach((cb) => {
      if ((cb as HTMLInputElement).checked) {
        const step = Number((cb as HTMLInputElement).dataset.step);
        if (step >= 1 && step <= proofSteps.length) prerequisiteRefs.push(step);
      }
    });
    const step: ProofStep = { outcome, reasonId, prerequisiteRefs };
    const snapshot = getPlaneStateSnapshot();
    const ctx = resolveContext(snapshot);
    const result = verifyStep(ctx, step, proofSteps);
    if (result.ok) {
      proofSteps.push(step);
      pushLog({
        op: 'proof_step',
        reasonId,
        outcome: { kind: step.outcome.kind, pointNames: step.outcome.pointNames },
        prerequisiteRefs,
      });
      if (outcomeTextInput) outcomeTextInput.value = '';
      renderProofSteps();
      updatePrereqCheckboxes();
      setProofStepMessage(result.message, false);
      onStepAdded();
    } else {
      setProofStepMessage(result.message, true);
    }
  });

  setMode('tools');
}
