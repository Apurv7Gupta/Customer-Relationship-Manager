### Frontend

```
frontend/
├── public/                 # Static assets (favicon, etc.)
├── src/
│   ├── assets/             # Images, fonts, and global CSS
│   ├── components/         # Global reusable UI components (Buttons, Inputs, Modals)
│   │   ├── ui/
│   │   └── form/           # Form validation wrappers (Zod + React Hook Form)
│   ├── config/             # Environment variables and global configuration
│   ├── context/            # Global React Contexts (e.g., AuthContext, ThemeContext)
│   ├── features/           # Feature-based modules (Screaming Architecture)
│   │   ├── auth/           # Authentication module (login, JWT handling)
│   │   ├── leads/          # Lead management module (CRUD, list, details)
│   │   ├── dashboard/      # Role-based dashboard statistics
│   │   ├── follow-ups/     # Follow-up tasks management
│   │   └── escalations/    # Human escalation workflow views
│   ├── hooks/              # Global custom React hooks (e.g., useAuth, useDebounce)
│   ├── layouts/            # Application layouts (DashboardLayout, AuthLayout)
│   ├── pages/              # Route entry points mapping to features
│   ├── routes/             # React Router configuration and protected route wrappers
│   ├── services/           # Reusable API service layer (Axios instances, interceptors)
│   ├── types/              # Global TypeScript interfaces and Zod schemas
│   ├── utils/              # Helper functions, formatters, and constants
│   ├── App.tsx             # Root application component
│   └── main.tsx            # Application entry point (ReactDOM render)
├── .env                    # Environment variables (FRONTEND_URL, API URL)
├── index.html              # Vite entry HTML
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration

```

### Backend

```
backend/
├── app/
│ ├── main.py
│ ├── api/
│ │ ├── auth.py
│ │ ├── users.py
│ │ ├── leads.py
│ │ ├── activities.py
│ │ ├── followups.py
│ │ ├── escalations.py
│ │ └── webhooks.py
│ ├── core/
│ │ ├── config.py
│ │ ├── security.py
│ │ ├── permissions.py
│ │ └── exceptions.py
│ ├── schemas/
│ ├── services/
│ ├── repositories/
│ ├── integrations/
│ │ ├── ai_provider.py
│ │ └── messaging_provider.py
│ └── tests/


```

### Auth Architechture

```
                    BACKEND
              ┌─────────────────┐
Frontend ────►│ /token          │
 username     │                 │
 password ───►│ verify password │
              │       ↓         │
              │   create JWT    │
              └───────┬─────────┘
                      │
                 JWT access token
                      │
                      ▼
Frontend ───────────────────────► Protected API
             Authorization:
             Bearer <JWT>
```
