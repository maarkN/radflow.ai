export type Role = 'radiologist' | 'admin' | 'technologist';

export type DemoUser = {
  id: string;
  username: string;
  /** Demo-only plaintext credential; replaced by a real IdP outside the demo. */
  password: string;
  name: string;
  role: Role;
};

/** Fixed demo identities — ids are stable so studies/reports survive restarts. */
export const DEMO_USERS: DemoUser[] = [
  {
    id: 'a1a1a1a1-0000-4000-8000-000000000001',
    username: 'ana',
    password: 'ana',
    name: 'Dra. Ana Souza',
    role: 'radiologist',
  },
  {
    id: 'a1a1a1a1-0000-4000-8000-000000000002',
    username: 'bruno',
    password: 'bruno',
    name: 'Dr. Bruno Lima',
    role: 'radiologist',
  },
  {
    id: 'a1a1a1a1-0000-4000-8000-000000000003',
    username: 'admin',
    password: 'admin',
    name: 'Alex Admin',
    role: 'admin',
  },
  {
    id: 'a1a1a1a1-0000-4000-8000-000000000004',
    username: 'tech',
    password: 'tech',
    name: 'Tati Tech',
    role: 'technologist',
  },
];
