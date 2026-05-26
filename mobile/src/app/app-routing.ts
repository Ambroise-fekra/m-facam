import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  { path: 'legal', loadComponent: () => import('./pages/legal/legal.page').then((m) => m.LegalPage) },

  { path: 'help', loadComponent: () => import('./pages/help/help.page').then((m) => m.HelpPage) },

  {
    path: 'auth',
    children: [
      { path: 'login', loadComponent: () => import('./pages/auth/login/login.page').then((m) => m.LoginPage) },
      {
        path: 'create-family',
        loadComponent: () =>
          import('./pages/auth/create-family/create-family.page').then((m) => m.CreateFamilyPage),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./pages/auth/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
      },
      {
        path: 'forgot-identifier',
        loadComponent: () =>
          import('./pages/auth/forgot-identifier/forgot-identifier.page').then((m) => m.ForgotIdentifierPage),
      },
      {
        path: 'verify-email',
        loadComponent: () =>
          import('./pages/auth/verify-email/verify-email.page').then((m) => m.VerifyEmailPage),
      },
      {
        path: 'accept-invite',
        loadComponent: () =>
          import('./pages/auth/accept-invite/accept-invite.page').then((m) => m.AcceptInvitePage),
      },
    ],
  },

  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'contribute',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/contribute/contribute.page').then((m) => m.ContributePage),
  },
  {
    path: 'events',
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./pages/events/list/events-list.page').then((m) => m.EventsListPage) },
      { path: 'create', loadComponent: () => import('./pages/events/create/event-create.page').then((m) => m.EventCreatePage) },
      { path: ':id', loadComponent: () => import('./pages/events/detail/event-detail.page').then((m) => m.EventDetailPage) },
    ],
  },
  {
    path: 'transactions',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/transactions/transactions.page').then((m) => m.TransactionsPage),
  },
  {
    path: 'members',
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./pages/members/list/members-list.page').then((m) => m.MembersListPage) },
      {
        path: 'add',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/members/add/member-add.page').then((m) => m.MemberAddPage),
      },
      { path: 'birthdays', loadComponent: () => import('./pages/birthdays/birthdays.page').then((m) => m.BirthdaysPage) },
      { path: 'edit/:id', loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage) },
    ],
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage),
  },
  {
    path: 'genealogy',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/genealogy/genealogy.page').then((m) => m.GenealogyPage),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/notifications/notifications.page').then((m) => m.NotificationsPage),
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/admin/admin.page').then((m) => m.AdminPage),
  },
  {
    path: 'subscription',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/subscription/subscription.page').then((m) => m.SubscriptionPage),
  },

  { path: '**', redirectTo: 'dashboard' },
];
