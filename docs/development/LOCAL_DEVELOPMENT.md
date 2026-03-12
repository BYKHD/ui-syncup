# Local Development Setup

> **Note**: We have migrated to Supabase CLI for local development. Please refer to [SUPABASE_LOCAL_SETUP.md](./SUPABASE_LOCAL_SETUP.md) for the latest instructions. The instructions below regarding `docker-compose` are for the legacy setup.



This guide walks you through setting up UI SyncUp for local development, including all required services and environment configuration.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20 LTS** (see `.nvmrc` for exact version)
- **Bun** (package manager) - Install: `curl -fsSL https://bun.sh/install | bash`
- **Docker Desktop** (for local services)
- **Git**

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd ui-syncup

# 2. Install dependencies
bun install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your local configuration (see below)

# 4. Start local Supabase stack
bun run supabase:start

# 5. Run database migrations
bun run db:push  # For rapid prototyping
# OR
bun run db:migrate # For production-like migrations

# 6. Start the development server
bun dev
```

The application will be available at `http://localhost:3000`.

## Environment Configuration

### Step 1: Copy the Template

```bash
cp .env.example .env.local
```

### Step 2: Configure Local Services

Update `.env.local` with the following local development values:

```bash
# =============================================================================
# Application
# =============================================================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# =============================================================================
# Database (Local PostgreSQL via Docker)
# =============================================================================
# Use the local PostgreSQL instance from docker-compose
DATABASE_URL=postgresql://postgres:password@localhost:5432/ui_syncup_dev
DIRECT_URL=postgresql://postgres:password@localhost:5432/ui_syncup_dev

# For local development, you can use placeholder values or set up a Supabase dev project
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=local-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=local-dev-service-role-key

# =============================================================================
# Storage (Local MinIO via Docker - S3-compatible)
# =============================================================================
R2_ACCOUNT_ID=local
R2_ACCESS_KEY_ID=devminio
R2_SECRET_ACCESS_KEY=devminiosecret
R2_BUCKET_NAME=ui-syncup-dev
R2_PUBLIC_URL=http://localhost:9000

# =============================================================================
# Authentication (Google OAuth)
# =============================================================================
# Create a Google OAuth app at https://console.cloud.google.com/apis/credentials
# Add http://localhost:3000 to authorized origins
# Add http://localhost:3000/api/auth/callback/google to authorized redirect URIs
GOOGLE_CLIENT_ID=your-dev-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-dev-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# =============================================================================
# better-auth Configuration
# =============================================================================
# Generate a secure secret: openssl rand -base64 32
BETTER_AUTH_SECRET=local-dev-secret-key-min-32-characters-change-me
BETTER_AUTH_URL=http://localhost:3000

# =============================================================================
# Feature Flags (Optional)
# =============================================================================
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=true
```

### Step 3: Set Up External Services (Optional)

For full functionality, you'll need to configure external services:

#### Google OAuth (Required for Authentication)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Add authorized origins:
   - `http://localhost:3000`
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
5. Copy the Client ID and Client Secret to `.env.local`

#### Supabase (Optional - for production-like database)

1. Create a free project at [supabase.com](https://supabase.com)
2. Get your project URL and keys from Settings → API
3. Update `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

#### Cloudflare R2 (Optional - for production-like storage)

1. Create a Cloudflare account and enable R2
2. Create a bucket for development
3. Generate API tokens
4. Update R2 variables in `.env.local`

> **Note**: For local development, the Docker services (PostgreSQL + MinIO) are sufficient. External services are only needed if you want to test production-like behavior.

## Local Services

### Service Endpoints

| Service | URL | Credentials |
|---------|-----|-------------|
| **Application** | http://localhost:3000 | N/A |
| **PostgreSQL** | localhost:5432 | User: `postgres`<br>Password: `password`<br>Database: `ui_syncup_dev` |
| **pgAdmin** | http://localhost:5050 | Email: `admin@example.com`<br>Password: `admin` |
| **MinIO (S3 API)** | http://localhost:9000 | Access Key: `devminio`<br>Secret Key: `devminiosecret` |
| **MinIO Console** | http://localhost:9001 | Same as above |

### Managing Docker Services

```bash
# Start all services
docker-compose up -d

# View service status
docker-compose ps

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f postgres

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v

# Restart a specific service
docker-compose restart postgres
```

### Health Checks

All services include health checks. Wait for services to be healthy before starting the app:

```bash
# Check service health
docker-compose ps

# Wait for all services to be healthy
until docker-compose ps | grep -q "healthy"; do
  echo "Waiting for services to be healthy..."
  sleep 2
done
```

## Database Setup

### Initial Setup

The PostgreSQL container automatically creates the `ui_syncup_dev` database on first start.

### Running Migrations

```bash
# Run pending migrations
bun run db:migrate

# Generate new migration
bun run db:generate

# Push schema changes (development only)
bun run db:push
```

### Accessing the Database

#### Via pgAdmin (Web UI)

1. Open http://localhost:5050
2. Login with `admin@example.com` / `admin`
3. Add a new server:
   - **Name**: UI SyncUp Local
   - **Host**: `postgres` (Docker network name)
   - **Port**: `5432`
   - **Database**: `ui_syncup_dev`
   - **Username**: `postgres`
   - **Password**: `password`

#### Via Command Line

```bash
# Connect to PostgreSQL
docker exec -it ui-syncup-postgres psql -U postgres -d ui_syncup_dev

# Run SQL commands
\dt              # List tables
\d table_name    # Describe table
SELECT * FROM users LIMIT 10;
```

## Storage Setup (MinIO)

### Initial Setup

MinIO starts automatically with Docker Compose. You need to create a bucket for local development.

### Creating a Bucket

#### Via MinIO Console (Web UI)

1. Open http://localhost:9001
2. Login with `devminio` / `devminiosecret`
3. Click "Buckets" → "Create Bucket"
4. Name: `ui-syncup-dev`
5. Click "Create Bucket"

#### Via Command Line

```bash
# Install MinIO client
brew install minio/stable/mc  # macOS
# or download from https://min.io/docs/minio/linux/reference/minio-mc.html

# Configure alias
mc alias set local http://localhost:9000 devminio devminiosecret

# Create bucket
mc mb local/ui-syncup-dev

# List buckets
mc ls local

# Upload test file
mc cp test.jpg local/ui-syncup-dev/
```

### Testing Storage Integration

```bash
# Test S3-compatible API
curl http://localhost:9000/ui-syncup-dev/
```

## Development Workflow

### Starting Development

```bash
# 1. Ensure Docker services are running
docker-compose up -d

# 2. Start the dev server
bun dev

# 3. Open browser
open http://localhost:3000
```

### Common Commands

```bash
# Development
bun dev                 # Start dev server with hot reload
bun build              # Production build
bun start              # Start production server

# Code Quality
bun typecheck          # TypeScript type checking
bun lint               # ESLint
bun format             # Prettier formatting

# Testing
bun test               # Run unit tests (Vitest)
bun test:watch         # Run tests in watch mode
bun test:ui            # Run E2E tests (Playwright)

# Database
bun run db:migrate     # Run migrations
bun run db:generate    # Generate migration from schema
bun run db:push        # Push schema changes (dev only)
bun run db:studio      # Open Drizzle Studio
```

### Hot Reload

The development server supports hot module replacement (HMR):

- **React components**: Instant updates without page refresh
- **Server components**: Automatic page refresh
- **API routes**: Automatic restart
- **Environment variables**: Requires server restart

## Troubleshooting

### Port Conflicts

If ports are already in use, you can change them in `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"  # Change PostgreSQL port to 5433
  - "5051:80"    # Change pgAdmin port to 5051
  - "9002:9000"  # Change MinIO API port to 9002
  - "9003:9001"  # Change MinIO Console port to 9003
```

Remember to update your `.env.local` accordingly.

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Test connection
docker exec -it ui-syncup-postgres pg_isready -U postgres
```

### MinIO Connection Issues

```bash
# Check if MinIO is running
docker-compose ps minio

# View MinIO logs
docker-compose logs minio

# Restart MinIO
docker-compose restart minio

# Test health endpoint
curl http://localhost:9000/minio/health/live
```

### Environment Variable Issues

```bash
# Validate environment variables
bun run validate-env

# Check if .env.local exists
ls -la .env.local

# Verify environment variables are loaded
bun run dev --inspect
```

### Clean Slate

If you need to start fresh:

```bash
# Stop all services and remove volumes
docker-compose down -v

# Remove node_modules and reinstall
rm -rf node_modules bun.lockb
bun install

# Remove .next cache
rm -rf .next

# Start services again
docker-compose up -d

# Recreate .env.local
cp .env.example .env.local
# Edit .env.local with your values
```

## Production Parity

The local development environment is designed to mirror production as closely as possible:

| Service | Local | Production |
|---------|-------|------------|
| **App Runtime** | Node.js 20 + Bun | Vercel (Node.js 20) |
| **Database** | PostgreSQL 16 (Docker) | Supabase (PostgreSQL 15+) |
| **Storage** | MinIO (S3-compatible) | Cloudflare R2 (S3-compatible) |
| **Auth** | Google OAuth (dev app) | Google OAuth (prod app) |

### Key Differences

- **Local**: Uses Docker containers for database and storage
- **Production**: Uses managed services (Supabase, Cloudflare R2)
- **Local**: Single-tenant (your machine)
- **Production**: Multi-tenant (Vercel edge network)

## Next Steps

Once your local environment is running:

1. **Explore the codebase**: See `docs/STRUCTURE.md` for architecture overview
2. **Run tests**: `bun test` to ensure everything works
3. **Create a feature**: Follow the feature scaffolding guide in `AGENTS.md`
4. **Deploy to preview**: Push to a feature branch to trigger Vercel preview deployment

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
- [Deployment Guide](./DEPLOYMENT.md)

## Getting Help

If you encounter issues:

1. Check this documentation
2. Review the [Troubleshooting](#troubleshooting) section
3. Check Docker service logs: `docker-compose logs`
4. Ask the team in Slack/Discord
5. Create an issue in the repository
