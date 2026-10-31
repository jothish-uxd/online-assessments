import type { PersonId } from './types';

/* Placeholder team, from the Star Wars galaxy. */
export interface Person { id: PersonId; name: string; role: string; initials: string }

export const PEOPLE: Record<PersonId, Person> = {
  leia:    { id: 'leia',    name: 'Leia Organa',   role: 'Research scientist',   initials: 'LO' },
  mon:     { id: 'mon',     name: 'Mon Mothma',    role: 'Principal scientist',  initials: 'MM' },
  jyn:     { id: 'jyn',     name: 'Jyn Erso',      role: 'Research scientist',   initials: 'JE' },
  cassian: { id: 'cassian', name: 'Cassian Andor', role: 'Research scientist',   initials: 'CA' },
  hera:    { id: 'hera',    name: 'Hera Syndulla', role: 'Assessment operations', initials: 'HS' },
  wedge:   { id: 'wedge',   name: 'Wedge Antilles', role: 'Content designer',    initials: 'WA' },
};

/** The person signed in to this prototype. Every change is stamped with them. */
export const ME: PersonId = 'leia';

export const person = (id: PersonId) => PEOPLE[id];
