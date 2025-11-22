# SafeBank Frontend

Secure online banking React application for Software Security course project.

## Features

### ✅ Implemented

- **Secure Authentication**
  - RS256 JWT token-based auth
  - Login/Register with validation
  - Auto-logout on token expiration
  - Session timeout warnings

- **Role-Based Dashboards**
  - Customer Dashboard (banking operations)
  - Admin Dashboard (user management)
  - Support Agent Dashboard (ticket management)

- **Security Features**
  - XSS protection with DOMPurify
  - Input validation and sanitization
  - Protected routes (RBAC)
  - Secure API client with interceptors
  - Monetary precision (Decimal type)
  - Generic error messages

- **UI/UX**
  - Responsive design (mobile-first)
  - Tailwind CSS styling
  - Loading states and error handling
  - Accessible navigation

## Tech Stack

- **Framework:** React 18 + Vite
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Styling:** Tailwind CSS
- **Icons:** Heroicons
- **Security:** DOMPurify
- **Validation:** Custom validators + React Hook Form (ready to use)

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Backend services running (see `backend/README.md`)

### Installation

1. Navigate to the frontend app:
```bash
cd frontend/safebank-app
```

2. Install dependencies (already done if following setup):
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

Create `.env` file (already created):
```
VITE_AUTH_SERVICE_URL=http://localhost:5001
VITE_ACCOUNTS_SERVICE_URL=http://localhost:5002
VITE_ADMIN_SERVICE_URL=http://localhost:5003
VITE_SUPPORT_SERVICE_URL=http://localhost:5004
```

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── common/         # Common UI components
│   ├── customer/       # Customer-specific components
│   ├── admin/          # Admin-specific components
│   ├── support/        # Support-specific components
│   ├── DashboardLayout.jsx
│   └── ProtectedRoute.jsx
├── contexts/           # React contexts
│   └── AuthContext.jsx
├── pages/              # Page components
│   ├── customer/       # Customer dashboard pages
│   ├── admin/          # Admin dashboard pages
│   ├── support/        # Support dashboard pages
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── DashboardRedirect.jsx
│   ├── Forbidden.jsx
│   └── NotFound.jsx
├── utils/              # Utility functions
│   ├── api.js          # Secure API client
│   ├── auth.js         # JWT management
│   ├── sanitize.js     # XSS protection
│   └── validators.js   # Input validation
├── App.jsx             # Main app with routing
└── main.jsx            # Entry point
```

## Available Routes

### Public Routes
- `/login` - User login
- `/register` - User registration
- `/forbidden` - 403 Access denied
- `/404` - Page not found

### Protected Routes

**Customer** (role: `customer`)
- `/customer` - Dashboard
- `/customer/accounts` - View accounts
- `/customer/transactions` - Transaction history
- `/customer/transfer` - Make transfers
- `/customer/tickets` - Support tickets

**Admin** (role: `admin`)
- `/admin` - Admin dashboard
- `/admin/users` - User management

**Support Agent** (role: `support_agent`)
- `/support` - Support dashboard
- `/support/tickets` - Ticket management
- `/support/accounts` - Customer accounts (read-only)

## Security Features

See [SECURITY_DOCUMENTATION.md](./SECURITY_DOCUMENTATION.md) for detailed security implementation.

### Quick Summary:

1. **RS256 JWT** - Asymmetric token validation
2. **XSS Protection** - DOMPurify sanitization
3. **Input Validation** - Multi-layer validation
4. **RBAC** - Role-based access control
5. **Secure API** - Axios interceptors
6. **Session Management** - Auto-logout
7. **Error Handling** - Generic messages
8. **Decimal Precision** - Monetary accuracy

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Default Test Accounts

After seeding backend database:

**Admin:**
- Email: `admin@example.com`
- Password: `Admin@2024!` (must change on first login)

**Customer** (register your own or create via admin)

## Next Steps

The frontend skeleton is complete with:
- ✅ Authentication system (login, register)
- ✅ Protected routing with RBAC
- ✅ Dashboard layouts for all roles
- ✅ Secure API client
- ✅ XSS protection & input validation

**To complete the dashboards**, you need to build out the stub pages:
- Customer: Account listings, transaction forms, transfer UI, ticket creation
- Admin: User management table, role assignment interface
- Support: Ticket management, customer account viewing

## Contributing

This is a course project. Follow secure coding practices:

1. Always sanitize user input
2. Validate on both client and server
3. Use ProtectedRoute for authenticated pages
4. Follow the established security patterns
5. Test thoroughly before committing

## Documentation

- [SECURITY_DOCUMENTATION.md](./SECURITY_DOCUMENTATION.md) - Comprehensive security features
- Backend API docs in `backend/Guides/`

## License

Educational use only - Software Security Course Project

## Support

For backend API documentation, see:
- `backend/Guides/BANKING_OPERATIONS.md`
- `backend/Guides/SECURITY.md`
- `backend/support_service/API_DOCUMENTATION.md`

---

**Built with security-first principles for educational demonstration**
