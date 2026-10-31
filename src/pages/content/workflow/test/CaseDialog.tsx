import { useState } from 'react';
import Select from '../../../../components/Select';
import Dialog from '../../../../components/content/Dialog';
import { AlertIcon } from '../../../../components/content/icons';
import { now } from '../../../../data/content/store';
import {
  COUNTRIES, JOB_CLASSES, JOB_CODES, JOB_FAMILIES, JOB_LEVELS, TEST_CANDIDATES, newCaseId,
} from '../../../../data/content/testplan';
import { addCase, updateCase } from '../../../../data/content/workflows';
import type { TestCase, Workflow } from '../../../../data/content/types';

const opts = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));

/** Add a case, or edit one that has no test link yet. */
export default function CaseDialog({ w, suiteId, existing, onClose, onSaved }: {
  w: Workflow; suiteId: string; existing?: TestCase; onClose: () => void; onSaved: () => void;
}) {
  const [d, setD] = useState<TestCase>(() => existing ? structuredClone(existing) : {
    id: newCaseId(), title: '', summary: '', version: w.version, candidateId: '', country: '', jobCode: '', jobFamily: '', jobLevel: '', jobClass: '',
    instructions: [], expected: '', result: { tester: '', outcome: 'not-tested', notes: '' }, created: now(),
  });
  const [instr, setInstr] = useState(() => (existing?.instructions ?? []).join('\n'));
  const [tried, setTried] = useState(false);
  const set = (p: Partial<TestCase>) => setD((x) => ({ ...x, ...p }));

  const required: [keyof TestCase, string][] = [
    ['title', 'Scenario'], ['candidateId', 'Candidate'], ['country', 'Home system'], ['jobCode', 'Job code'],
    ['jobFamily', 'Job family'], ['jobLevel', 'Job level'], ['jobClass', 'Job classification'], ['expected', 'Expected behavior'],
  ];
  const missing = required.filter(([k]) => !String(d[k] ?? '').trim());
  const bad = (k: keyof TestCase) => tried && missing.some(([m]) => m === k);

  const save = () => {
    setTried(true);
    if (missing.length) { requestAnimationFrame(() => document.getElementById('case-errors')?.focus()); return; }
    const out = { ...d, title: d.title.trim(), instructions: instr.split('\n').map((x) => x.trim()).filter(Boolean) };
    if (existing) updateCase(w.id, suiteId, out, `Edited test case: ${out.title}`);
    else addCase(w.id, suiteId, out);
    onSaved();
  };

  return (
    <Dialog open onClose={onClose} size="lg" title={existing ? 'Edit case' : 'Add new case'}
      description={<p>Fields marked with an asterisk (*) are required. The candidate and job metadata decide which score variation and re-used scores apply.</p>}
      footer={<>
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="case-form" className="btn btn--primary">{existing ? 'Save case' : 'Add case'}</button>
      </>}>
      <form id="case-form" className="form case-form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        {tried && missing.length > 0 && (
          <div id="case-errors" className="issues" tabIndex={-1} role="alert"><AlertIcon /><p>Fill in: {missing.map(([, l]) => l).join(', ')}.</p></div>
        )}
        <div className="field case-form__wide">
          <label className="field__label" htmlFor="case-title">Scenario <span className="req" aria-hidden="true">*</span></label>
          <input id="case-title" autoFocus value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="For example: First-time candidate application" aria-invalid={bad('title')} />
        </div>
        <div className="field case-form__wide">
          <label className="field__label" htmlFor="case-summary">Summary</label>
          <input id="case-summary" value={d.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="One line on what this case proves" />
        </div>
        <div className="field">
          <span className="field__label">Workflow</span>
          <span className="field__static field__static--off">{w.name} (ver {d.version})</span>
        </div>
        <Select label="Candidate *" value={d.candidateId} placeholder="Choose an option" invalid={bad('candidateId')}
          options={TEST_CANDIDATES.map((c) => ({ value: c.id, label: `${c.name} (ID: ${c.id})` }))}
          onChange={(v) => set({ candidateId: v, country: d.country || TEST_CANDIDATES.find((c) => c.id === v)?.home || '' })} />
        <Select label="Home system *" value={d.country} placeholder="Choose an option" invalid={bad('country')} options={opts(COUNTRIES)} onChange={(v) => set({ country: v })} />
        <Select label="Job code *" value={d.jobCode} placeholder="Choose an option" invalid={bad('jobCode')} options={opts(JOB_CODES)} onChange={(v) => set({ jobCode: v })} />
        <Select label="Job family *" value={d.jobFamily} placeholder="Choose an option" invalid={bad('jobFamily')} options={opts(JOB_FAMILIES)} onChange={(v) => set({ jobFamily: v })} />
        <Select label="Job level *" value={d.jobLevel} placeholder="Choose an option" invalid={bad('jobLevel')} options={opts(JOB_LEVELS)} onChange={(v) => set({ jobLevel: v })} />
        <div className="case-form__wide">
          <Select label="Job classification *" value={d.jobClass} placeholder="Choose an option" invalid={bad('jobClass')} options={opts(JOB_CLASSES)} onChange={(v) => set({ jobClass: v })} />
        </div>
        <div className="field case-form__wide">
          <label className="field__label" htmlFor="case-instr">Instructions</label>
          <textarea id="case-instr" rows={3} value={instr} onChange={(e) => setInstr(e.target.value)} placeholder="One step per line" aria-describedby="case-instr-h" />
          <span id="case-instr-h" className="field-help">What the tester does, one step per line.</span>
        </div>
        <div className="field case-form__wide">
          <label className="field__label" htmlFor="case-exp">Expected behavior <span className="req" aria-hidden="true">*</span></label>
          <textarea id="case-exp" rows={4} value={d.expected} onChange={(e) => set({ expected: e.target.value })} placeholder="Provide scenario expectations, one per line" aria-invalid={bad('expected')} />
        </div>
      </form>
    </Dialog>
  );
}
