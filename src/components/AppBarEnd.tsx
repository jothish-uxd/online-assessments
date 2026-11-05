import { ResetButton } from '@jothish-uxd/enterprise-library';
import Menu from './content/Menu';
import { PEOPLE, person, setMe, useMe } from '../data/content/people';

/**
 * Right end of an app's browser bar: reset, help and the signed-in person.
 * Help items are placeholders until each app has real help content.
 */
export default function AppBarEnd({ what, description, to, onReset, onSoon }: {
  what: string; description: string; to: string; onReset: () => void; onSoon: (text: string) => void;
}) {
  const me = person(useMe());
  const soon = (thing: string) => () => onSoon(`${thing} isn’t available in this prototype yet.`);
  return (
    <>
      <ResetButton what={what} description={description} done={`${what[0].toUpperCase()}${what.slice(1)} reset.`} to={to} onReset={onReset} />
      <Menu label="Help" className="menu--avatar hire-help" items={[
        { label: 'Help center', onSelect: soon('The help center') },
        { label: 'What’s new', onSelect: soon('What’s new') },
        { label: 'Keyboard shortcuts', onSelect: soon('Keyboard shortcuts') },
        { label: 'Contact your admin', divider: true, onSelect: soon('Contacting your admin') },
      ]}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M6.2 6.2a1.9 1.9 0 0 1 3.6.8c0 1.3-1.8 1.6-1.8 2.7M8 11.6v.1" /></svg>
      </Menu>
      <Menu label={`Signed in as ${me.name}, ${me.role}. Switch person`} className="menu--avatar" items={
        Object.values(PEOPLE).filter((p) => p.id !== me.id).map((p) => ({ label: `Switch to ${p.name} · ${p.role}`, onSelect: () => setMe(p.id) }))
      }>
        <span className="avatar avatar--sm" aria-hidden="true">{me.initials}</span>
      </Menu>
    </>
  );
}
