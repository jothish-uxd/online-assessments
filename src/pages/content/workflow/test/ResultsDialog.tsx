import { useState } from 'react';
import Dialog from '../../../../components/content/Dialog';
import { AlertIcon } from '../../../../components/content/icons';
import { now } from '../../../../data/content/store';
import { OUTCOME_TEXT } from '../../../../data/content/testplan';
import { updateCase } from '../../../../data/content/workflows';
import type { CaseOutcome, TestCase, Workflow } from '../../../../data/content/types';

const OUTCOMES: CaseOutcome[] = ['pass', 'fail', 'retest', 'not-tested'];

/** Record what happened when the case was run. */
export default function ResultsDialog({ w, suiteId, tc, oa, onClose, onSaved }: {
  w: Workflow; suiteId: string; tc: TestCase; oa: string | null; onClose: () => void; onSaved: () => void;
}) {
  const [tester, setTester] = useState(tc.result.tester);
  const [outcome, setOutcome] = useState<CaseOutcome>(tc.result.outcome);
  const [notes, setNotes] = useState(tc.result.notes);
  const [tried, setTried] = useState(false);
  const canRun = !!tc.link;
  const notesMissing = outcome !== 'not-tested' && !notes.trim();

  const save = () => {
    setTried(true);
    if (notesMissing) return;
    updateCase(w.id, suiteId, {
      ...tc,
      result: { tester: tester.trim(), outcome, notes: notes.trim(), entered: outcome === 'not-tested' ? undefined : now() },
    }, `Recorded ${OUTCOME_TEXT[outcome].toLowerCase()} for a test case`);
    onSaved();
  };

  return (
    <Dialog open onClose={onClose} title="Edit case results"
      footer={<>
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="results-form" className="btn btn--primary">Save case results</button>
      </>}>
      <form id="results-form" className="form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="field">
          <span className="field__label">OA score</span>
          <span className="field__static field__static--off">{oa ?? 'Not available'}</span>
          <span className="field-help">Calculated by the system after the case is run.</span>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="res-tester">Tester</label>
          <input id="res-tester" value={tester} onChange={(e) => setTester(e.target.value)} placeholder="Please enter a name" autoComplete="off" />
        </div>
        <fieldset className="radio-row radio-row--wrap">
          <legend className="field__label">Test result <span className="req" aria-hidden="true">*</span></legend>
          {OUTCOMES.map((o) => (
            <label key={o} className="check">
              <input type="radio" name="res-outcome" checked={outcome === o} disabled={!canRun && o !== 'not-tested'} onChange={() => setOutcome(o)} />
              {OUTCOME_TEXT[o] === 'Passed' ? 'Pass' : OUTCOME_TEXT[o] === 'Failed' ? 'Fail' : OUTCOME_TEXT[o]}
            </label>
          ))}
        </fieldset>
        {!canRun && <p className="field-help">Generate the test link and run the case before recording a result.</p>}
        <div className="field">
          <label className="field__label" htmlFor="res-notes">Notes {outcome !== 'not-tested' && <span className="req" aria-hidden="true">*</span>}</label>
          <span id="res-notes-h" className="field-help">Did everything work as expected? Were there any issues or unexpected behaviors?</span>
          <textarea id="res-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} aria-describedby="res-notes-h" aria-invalid={tried && notesMissing} />
          {tried && notesMissing && <span className="field-error-text"><AlertIcon /> Add notes on the outcome.</span>}
        </div>
      </form>
    </Dialog>
  );
}
