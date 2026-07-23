import type { RouteObject } from 'react-router-dom';
import { CockpitLayout } from './layout/cockpit-layout';
import { AdminPage } from '../pages/admin-page';
import { DictationPage } from '../pages/dictation-page';
import { LoginPage } from '../pages/login-page';
import { WorklistPage } from '../pages/worklist-page';

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <CockpitLayout />,
    children: [
      { index: true, element: <WorklistPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'dictate/:studyId', element: <DictationPage /> },
    ],
  },
];
