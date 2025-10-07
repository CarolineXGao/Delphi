# Delphi Study Platform

A secure, low-cost platform for conducting Delphi research studies with integrated qualitative and quantitative analysis, built with Next.js, TypeScript, and Supabase.

## Features

- **Multi-Round Delphi Studies**: Configure and manage studies with customizable Likert scales and consensus rules
- **Qualitative Proposal Entry**: Participants submit recommendations with AI-assisted suggestions
- **Quantitative Rating Rounds**: Structured rating system with group feedback and consensus tracking
- **AI-Assisted Analysis**: Clustering of similar proposals and comment summarization
- **Participant Anonymization**: Pseudo-ID system for privacy protection
- **Consensus Calculation**: IQR and Net Agreement methods for measuring group consensus
- **Real-Time Analytics**: Dashboard with study progress and participant metrics
- **Secure Authentication**: Supabase Auth with email/password authentication

## Technology Stack

- **Frontend**: Next.js 13 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui with Radix UI primitives
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel (or any Node.js hosting)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier available)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd delphi-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

The database schema is already configured in Supabase. The migration includes:

- **studies**: Study configuration and settings
- **participants**: User participation records with pseudo-IDs
- **proposals**: Qualitative recommendations from Stage 1-2
- **delphi_items**: Curated items for Delphi rounds
- **rounds**: Round configuration and status
- **responses**: Participant ratings and comments
- **documents**: File attachments and evidence
- **surveys**: Post-assessment feedback

All tables have Row Level Security (RLS) enabled with appropriate policies.

## Consensus Calculation

The platform supports two consensus methods:

### IQR (Interquartile Range)
Consensus is reached when IQR ≤ threshold (default: 1)

### Net Agreement
Net Agreement = (%agree - 2×%disagree)
Consensus is reached when Net Agreement ≥ threshold (default: 75%)

## AI Integration

The platform includes placeholder AI endpoints for:

- **Suggestion API** (`/api/ai/suggest`): Generate writing suggestions for proposals
- **Clustering API** (`/api/ai/cluster`): Group similar recommendations
- **Summarization API** (`/api/ai/summarise`): Summarize participant comments

These currently use mock data but can be connected to:
- Azure OpenAI
- Microsoft Copilot API
- Any LLM API service

## Microsoft 365 Integration

The platform is designed to integrate with Microsoft 365 services:

### Planned Integrations

1. **Microsoft Entra ID (Azure AD)**
   - OAuth2 authentication
   - Single Sign-On (SSO)

2. **SharePoint Lists**
   - Data storage alternative to Supabase
   - Access via Microsoft Graph API

3. **OneDrive/SharePoint**
   - Document storage for fact & evidence files
   - File picker integration

4. **Power Automate**
   - Workflow automation (round notifications, exports)
   - Webhook endpoints for triggering flows

5. **Power BI**
   - Advanced analytics and reporting
   - Dashboard embedding

### Setup Instructions

To connect Microsoft Graph API:

1. Register an app in Azure Portal
2. Configure redirect URIs
3. Grant required permissions (User.Read, Sites.ReadWrite.All, Files.ReadWrite.All)
4. Add credentials to `.env`:
```
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=your-tenant-id
```

## Project Structure

```
/app
  /api/ai         - AI assistance endpoints
  /dashboard      - Protected dashboard pages
  /login          - Authentication page
  page.tsx        - Landing page
/components
  /ui             - Reusable UI components (shadcn/ui)
  DashboardLayout.tsx
  ProtectedRoute.tsx
/contexts
  AuthContext.tsx - Authentication context
/lib
  supabase.ts     - Supabase client and types
  consensus.ts    - Consensus calculation utilities
  utils.ts        - Utility functions
```

## Workflow

### Study Creation (Admin)
1. Create study with title, description, domains
2. Configure Likert scale and consensus rules
3. Add participants (manual or CSV import)

### Stage 1-2: Qualitative Proposals
1. Participants submit recommendations per domain
2. AI suggests improvements and identifies clusters
3. Admin reviews, merges duplicates, creates final Delphi items

### Stage 3-5: Delphi Rounds
1. Admin opens Round 1
2. Participants rate items (1-9 Likert scale) and comment
3. System calculates group statistics (median, IQR)
4. Round 2+: Participants see group feedback, revise ratings
5. Admin views consensus dashboard, exports results

### Post-Assessment
Participants complete reflection survey on clarity, engagement, perceived consensus

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

The app can be deployed to any Node.js hosting service:
- Azure Static Web Apps
- AWS Amplify
- Netlify
- Railway
- Render

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run typecheck
```

## Security Considerations

- All database tables use Row Level Security (RLS)
- Participant data is anonymized with pseudo-IDs
- Email-to-pseudo-ID mapping is restricted to study admins
- Authentication required for all dashboard routes
- Input validation on all forms
- Secure API endpoints with authentication checks

## Future Enhancements

- [ ] CSV import/export for participants and results
- [ ] Real-time collaboration features
- [ ] Advanced clustering algorithms
- [ ] Multi-language support
- [ ] Email notifications via SendGrid/Resend
- [ ] PDF report generation
- [ ] OAuth providers (Microsoft, Google)
- [ ] Audit logs and version history
- [ ] Study templates

## License

MIT

## Support

For issues or questions, please create an issue in the repository.
