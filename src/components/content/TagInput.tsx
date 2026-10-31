import { useId, useState } from 'react';

/** Tags as removable chips, with a field that adds one on Enter or comma. */
export default function TagInput({ label, tags, onChange }: { label: string; tags: string[]; onChange: (t: string[]) => void }) {
  const id = useId();
  const [text, setText] = useState('');
  const [said, setSaid] = useState('');

  const add = () => {
    const t = text.trim().toLowerCase().replace(/,$/, '');
    setText('');
    if (!t || tags.includes(t)) return;
    onChange([...tags, t]);
    setSaid(`Added tag ${t}`);
  };

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      {tags.length > 0 && (
        <ul className="chips" aria-label={`${label}: ${tags.length}`}>
          {tags.map((t) => (
            <li key={t} className="chip">
              {t}
              <button type="button" className="chip__x" aria-label={`Remove tag ${t}`}
                onClick={() => { onChange(tags.filter((x) => x !== t)); setSaid(`Removed tag ${t}`); }}>
                <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2 2 8" /></svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id} value={text} placeholder="Add a tag and press Enter"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        onBlur={add}
      />
      <span className="visually-hidden" role="status">{said}</span>
    </div>
  );
}
