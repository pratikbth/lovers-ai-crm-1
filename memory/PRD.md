# Wed Us CRM - Product Requirements Document

## Original Problem Statement
Build a CRM web app called "Wed Us CRM" for a wedding design company with:
- FastAPI backend (Python) + React frontend + MongoDB
- JWT authentication with Admin/Team Member roles
- Default admin: admin@wedus.com / admin123
- Sidebar navigation with live count badges
- Dashboard with stat cards
- All leads table with category/priority filters
- Team management
- Design: #FFF5F5 background, #E8536A coral pink accent, Poppins/Inter fonts
- Compact data-dense layout for maximum visibility
- Mobile responsive with bottom navigation

## User Personas
1. **Admin** - Full access to all leads, team management, settings
2. **Team Member** - Access only to assigned leads, cannot add team members

## Core Requirements (Static)
### Authentication
- JWT-based email/password login
- Role-based access control (admin/team_member)
- Protected routes with redirect to login
- Cookie-based token storage with httpOnly

### Database Schema - Leads
Required fields: companyName, phone, phone2, whatsapp, whatsapp2, primaryWhatsapp, instagram, email, city, address, state, status, category, categoryRank, priority, priorityRank, pipelineStage, assignedTo, sourceSheet, nextFollowupDate, lastContactDate, dateAdded, dateMarkedNotInterested, portfolioSent, priceListSent, waSent, responseHistory[], mostCommonResponse, mostCommonResponseRank, isDuplicate, duplicateOf, duplicateDismissed, notes, callCount

### Categories (with ranks)
1. Meeting Done, 2. Interested, 3. Call Back, 4. Busy, 5. No Response, 6. Foreign, 7. Future Projection, 8. Needs Review, 9. Not Interested

### Pipeline Stages
New Contact, Interested, Send Portfolio, Time Given, Meeting Scheduled, Meeting Done, Project Follow-up, Onboarded, Unknown, Call Again 1-3, Not Answering, Not Interested

### Priorities
1. Highest, 2. High, 3. Medium, 4. Low, 5. Review, 6. Archive

## What's Been Implemented

### Phase 1 - Core Setup (2026-03-30)
- FastAPI backend with all lead/team/auth endpoints
- JWT authentication with cookie-based tokens
- MongoDB models with proper indexes
- Admin seeding + sample team members
- React frontend with all routes, login, dashboard, sidebar
- Mobile responsive with bottom nav

### Phase 2 - Leads Management (2026-03-30)
- All Leads Table (Excel-style, sortable, filterable, paginated)
- CSV/Excel Import with column auto-mapping, fuzzy matching
- Add Lead Modal, Call Log Panel
- Lead Overview page with maps, editing, call history
- Duplicate Detection (phone, instagram, companyName+city)

### Phase 3 - Pipeline & Views (2026-03-30)
- Pipeline Kanban Board (drag-and-drop, 2 tracks, sorting)
- Today/Tomorrow/This Week date-filtered views
- 9 Category pages with shared LeadCard component
- Sidebar dates beside Today/Tomorrow

### Phase 4 - Import Duplicate Review (2026-03-30)
- **Complete rewrite of import duplicate handling**
- `POST /api/leads/import/analyze` - Parse file, detect duplicates, return non-duplicates + duplicate pairs with side-by-side data
- `POST /api/leads/import/batch` - Import array of pre-parsed non-duplicate leads
- `POST /api/leads/import/resolve` - Process user decisions (skip/overwrite/import_anyway/merge) for each duplicate
- Duplicate Review screen with:
  - Side-by-side comparison (Incoming vs Existing) for each duplicate pair
  - Per-row action buttons: Skip, Overwrite, Import Anyway, Merge
  - "Apply to all remaining" bulk action checkbox
  - Background import progress for non-duplicate leads
  - Match reason display (phone, instagram, companyName+city)
- Enhanced Import Summary: Imported Fresh, Skipped, Overwritten, Merged, Import Anyway, Errors
- Legacy import endpoint preserved for backward compatibility

## Prioritized Backlog

### P1 - High Priority
- [ ] Settings toggle to turn duplicate detection on/off globally
- [ ] Lead assignment round-robin distribution on import

### P2 - Medium Priority
- [ ] WhatsApp messaging templates (one-click standard messages)
- [ ] Meetings Calendar integration
- [ ] Reminders system
- [ ] Instagram/WhatsApp lead source filters
- [ ] Bulk category/priority updates

### P3 - Nice to Have
- [ ] Dashboard charts/analytics
- [ ] Duplicate merge functionality
- [ ] Lead notes and activity timeline
- [ ] Settings page (profile, notifications)
- [ ] Backend refactoring (split server.py into route modules)
