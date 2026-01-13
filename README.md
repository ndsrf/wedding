# Wedding Management App

A multi-tenant SaaS platform for professional wedding planners in the Spanish market, streamlining RSVP management, guest tracking, and gift coordination.

## Overview

The Wedding Management App enables wedding planners to manage multiple weddings simultaneously while providing couples with real-time guest tracking and friction-free RSVP experiences through persistent magic links.

## Key Features

- **Multi-tenant platform** with complete data isolation between weddings
- **Magic link authentication** for guests (no passwords required)
- **Family-based RSVP** system optimized for Spanish weddings
- **Excel import/export** for guest list management
- **Payment tracking** with automated bank transfer matching
- **Multi-language support** (Spanish, English, French, Italian, German)
- **Mobile-first design** optimized for WhatsApp in-app browsers
- **Custom theme system** for wedding branding

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React 18+, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js (OAuth)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Deployment**: Docker containers, GitHub Actions CI/CD
- **Languages**: TypeScript, multi-language i18n support

## Getting Started

### Prerequisites

- Node.js 18+ (LTS)
- Docker and docker-compose
- PostgreSQL 15+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/wedding.git
cd wedding

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## Development

```bash
# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

## Deployment

The application uses Docker containers and GitHub Actions for automated deployment. See the [deployment documentation](./docs/deployment.md) for details.

## Project Structure

```
wedding/
├── src/              # Application source code
├── prisma/           # Database schema and migrations
├── public/           # Static assets
├── tests/            # Test files
└── docker/           # Docker configuration
```

## License

[To be determined]

## Contact

For questions or support, please open an issue in the GitHub repository.

---

*This README will be updated with more detailed information as the project develops.*
