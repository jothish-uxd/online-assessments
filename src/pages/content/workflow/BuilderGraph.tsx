import { useId, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Menu from '../../../components/content/Menu';
import { AlertIcon, PlusIcon } from '../../../components/content/icons';
import { fmtSeconds, modulePoints, moduleTime, useModules } from '../../../data/content/store';
import { insertStep, moveStep, removeStep, type Issue } from '../../../data/content/workflows';
import type { Module, Step, Workflow } from '../../../data/content/types';
import { StatusBadge } from '../moduleBits';
import { contentRoutes } from '../routes';
import AddPopover, { type AddChoice } from './AddPopover';
import SettingsPanel from './SettingsPanel';
import { GripIcon, IdIcon, ProctorIcon } from './icons';
import { CommentButton, useComments } from './comments/Comments';

interface Props { w: Workflow; editable: boolean; issues: Issue[] }

const stepName = (s: Step, mods: Module[]) =>
  s.kind === 'id-check' ? 'ID verification'
  : s.kind === 'proctoring' ? 'Proctoring system check'
  : mods.find((m) => m.id === s.moduleId)?.name ?? 'Deleted module';

const focusSoon = (sel: string) => requestAnimationFrame(() => requestAnimationFrame(() =>
  (document.querySelector(sel) as HTMLElement | null)?.focus()));

/**
 * The builder graph: a vertical flow of modules and checkpoints.
 * Add at any + point; drag a node onto a + point to move it, or use the node's
 * options menu (the small circle) to move it with the keyboard.
 */
export default function BuilderGraph({ w, editable, issues }: Props) {
  const id = useId();
  const navigate = useNavigate();
  const modules = useModules();
  const { comment, openCount } = useComments();
  const [addingAt, setAddingAt] = useState<number | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overSlot, setOverSlot] = useState<number | null>(null);
  const [details, setDetails] = useState(false);
  const [said, setSaid] = useState('');

  const steps = w.steps;
  const dragFrom = dragId ? steps.findIndex((s) => s.id === dragId) : -1;
  const proctorAt = steps.findIndex((s) => s.kind === 'proctoring');
  const issueFor = (stepId: string) => issues.filter((x) => x.stepId === stepId);

  const where = (i: number) =>
    i === 0 ? (steps.length ? 'at the start' : 'the first step')
    : i === steps.length ? 'at the end'
    : `after ${stepName(steps[i - 1], modules)}`;

  const add = (index: number, p: AddChoice, label: string) => {
    const stepId = insertStep(w.id, index, p, label);
    setAddingAt(null);
    setSaid(`Added ${label} as step ${index + 1} of ${steps.length + 1}.`);
    focusSoon(`#step-${stepId} .menu__button`);
  };

  const move = (s: Step, to: number, label: string) => {
    const from = steps.indexOf(s);
    moveStep(w.id, s.id, to, label);
    const landed = to > from ? to - 1 : to;
    setSaid(`Moved ${label} to step ${landed + 1} of ${steps.length}.`);
    focusSoon(`#step-${s.id} .menu__button`);
  };

  /* ---- drag and drop ---- */
  const isNoop = (slot: number) => dragFrom >= 0 && (slot === dragFrom || slot === dragFrom + 1);
  const onDragStart = (e: DragEvent, s: Step) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', s.id);
    setDragId(s.id);
    setAddingAt(null);
  };
  const onDragEnd = () => { setDragId(null); setOverSlot(null); };
  const slotDrop = (slot: number) => ({
    onDragOver: (e: DragEvent) => { if (dragId && !isNoop(slot)) { e.preventDefault(); setOverSlot(slot); } },
    onDragLeave: () => setOverSlot((o) => (o === slot ? null : o)),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      const s = steps.find((x) => x.id === dragId);
      if (s && !isNoop(slot)) move(s, slot, stepName(s, modules));
      onDragEnd();
    },
  });

  const slot = (index: number) => {
    const proctored = proctorAt >= 0 && index > proctorAt;
    const dropping = dragId !== null && !isNoop(index);
    return (
      <div className={`slot${proctored ? ' is-proctored' : ''}${dropping ? ' is-droppable' : ''}${overSlot === index ? ' is-over' : ''}`} {...slotDrop(index)}>
        {editable && !dragId && (
          <button type="button" className="slot__add" aria-label={`Add ${where(index)}`} aria-expanded={addingAt === index}
            data-slot={index} onClick={() => setAddingAt(addingAt === index ? null : index)}>
            <PlusIcon />
          </button>
        )}
        {dropping && <span className="slot__drop">{overSlot === index ? 'Drop here' : ''}</span>}
        {addingAt === index && (
          <AddPopover where={where(index)} modules={modules} steps={steps}
            onPick={(p, label) => add(index, p, label)}
            onClose={() => { setAddingAt(null); focusSoon(`[data-slot="${index}"]`); }} />
        )}
      </div>
    );
  };

  return (
    <div className="wf-builder">
      <section className="canvas" aria-labelledby={`${id}-h`}>
        <div className="canvas__bar">
          <h2 id={`${id}-h`} className="section-title">Builder graph</h2>
          <button type="button" className="btn btn--secondary btn--sm" aria-pressed={details} onClick={() => setDetails((d) => !d)}>
            {details ? 'Hide module details' : 'Preview module details'}
          </button>
        </div>
        <p className="canvas__hint" id={`${id}-hint`}>
          {editable
            ? 'Choose + to add a module or checkpoint there. Drag a step onto a + to move it, or use its options button.'
            : w.stage === 'program-review' ? 'Locked while the workflow is in review. Use the comment buttons to leave feedback on a step.' : 'Locked since Program review approved it. Use the comment buttons to leave feedback on a step.'}
        </p>

        <div className="flow" aria-describedby={`${id}-hint`}>
          {slot(0)}
          {steps.length === 0 && <p className="flow__empty">No steps yet. Start with + above, usually with consent.</p>}
          <ol className="flow__list" aria-label={`${steps.length} steps`}>
            {steps.map((s, i) => {
              const m = s.kind === 'module' ? modules.find((x) => x.id === s.moduleId) : undefined;
              const name = stepName(s, modules);
              const problems = issueFor(s.id);
              const proctored = proctorAt >= 0 && i > proctorAt;
              const kindCls = s.kind === 'module' ? (m ? (m.kind === 'evaluative' ? 'eval' : 'content') : 'missing') : s.kind;
              const menu = editable && (
                <Menu label={`Options for ${name}, step ${i + 1}`} className="node__menu" items={[
                  { label: 'Move up', disabled: i === 0, onSelect: () => move(s, i - 1, name) },
                  { label: 'Move down', disabled: i === steps.length - 1, onSelect: () => move(s, i + 2, name) },
                  ...(m ? [{ label: 'Open module', onSelect: () => navigate(contentRoutes.module(m.id)) }] : []),
                  { label: 'Comment', onSelect: () => comment({ kind: 'step', id: s.id, label: name, tab: 'builder' }) },
                  { label: 'Remove from workflow', divider: true, onSelect: () => {
                    removeStep(w.id, s.id, name);
                    setSaid(`Removed ${name}.`);
                    focusSoon(`[data-slot="${i}"]`);
                  } },
                ]}>
                  <span className="visually-hidden">Options</span>
                </Menu>
              );
              return (
                <li key={s.id} id={`step-${s.id}`} className={`step${proctored ? ' is-proctored' : ''}${dragId === s.id ? ' is-dragging' : ''}`}>
                  {i === 0 && <span className="step__edge" aria-hidden="true">Start</span>}
                  {i === steps.length - 1 && steps.length > 1 && <span className="step__edge step__edge--end" aria-hidden="true">End</span>}

                  <div className={`node node--${kindCls}${problems.length ? ' has-issue' : ''}`}
                    draggable={editable} onDragStart={(e) => onDragStart(e, s)} onDragEnd={onDragEnd}>
                    {editable && <span className="node__grip" aria-hidden="true"><GripIcon /></span>}
                    {s.kind === 'id-check' && (
                      <span className="node__check"><IdIcon /> ID verification</span>
                    )}
                    {s.kind === 'proctoring' && (
                      <span className="node__check node__check--stack">
                        <span><ProctorIcon /> Proctoring system check</span>
                        <span className="node__sub">If successful, proctoring starts</span>
                      </span>
                    )}
                    {s.kind === 'module' && (
                      <span className="node__body">
                        <span className="node__kind">{m ? (m.kind === 'evaluative' ? 'Evaluation' : 'Content') : 'Missing'}</span>
                        <span className="node__name">{name}</span>
                        {details && m && (
                          <span className="node__details">
                            <StatusBadge status={m.status} />
                            <span>{m.items.length} item{m.items.length === 1 ? '' : 's'}{m.kind === 'evaluative' ? ` · ${modulePoints(m)} pts` : ''}{m.timing.mode !== 'off' ? ` · ${fmtSeconds(moduleTime(m).seconds)} timed` : ''}</span>
                          </span>
                        )}
                      </span>
                    )}
                    {proctored && s.kind === 'module' && <span className="visually-hidden">, proctored</span>}
                    {problems.length > 0 && (
                      <span className="node__issue"><AlertIcon /> {problems[0].text}</span>
                    )}
                    {menu || <CommentButton className="node__cbtn" target={{ kind: 'step', id: s.id, label: name, tab: 'builder' }} />}
                    {menu && openCount({ kind: 'step', id: s.id }) > 0 && (
                      <CommentButton className="node__cbtn node__cbtn--count" target={{ kind: 'step', id: s.id, label: name, tab: 'builder' }} />
                    )}
                  </div>
                  {slot(i + 1)}
                </li>
              );
            })}
          </ol>
        </div>
        <ul className="legend" aria-label="Key">
          <li><span className="legend__sw legend__sw--content" aria-hidden="true" /> Content, not scored (empty)</li>
          <li><span className="legend__sw legend__sw--eval" aria-hidden="true" /> Evaluation, scored (diagonal)</li>
          <li><span className="legend__sw legend__sw--id" aria-hidden="true" /> ID verification (dots)</li>
          <li><span className="legend__sw legend__sw--checkpoint" aria-hidden="true" /> Proctoring system check (crosshatch)</li>
          <li><span className="legend__sw legend__sw--proctor" aria-hidden="true" /> Proctored from here (ladder)</li>
        </ul>
        <span className="visually-hidden" role="status" aria-live="polite">{said}</span>
      </section>

      <SettingsPanel w={w} editable={editable} />
    </div>
  );
}
