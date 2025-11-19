# PRD: Projects & Task Management

**Version:** 1.0
**Status:** P1 Production Feature
**Owner:** Product Team
**Last Updated:** 2025-11-17
**Related PRDs:** [PRD-CRM-ACCOUNTS.md](./PRD-CRM-ACCOUNTS.md), [PRD-DOCUMENTS.md](./PRD-DOCUMENTS.md), [PRD-MULTI-TENANCY.md](./PRD-MULTI-TENANCY.md)

---

## 1. Executive Summary

The Projects & Task Management module transforms NextCRM from a traditional CRM into a complete work management platform. It provides Kanban-style project boards, task tracking with assignments and due dates, AI-powered notifications, and cross-functional collaboration tools. This module bridges sales and delivery, enabling teams to manage the entire customer lifecycle from opportunity to project completion.

**Key Value Proposition:**
- **Visual Work Management:** Kanban boards with drag-and-drop task organization provide clarity on project status at a glance
- **Seamless CRM Integration:** Link projects to accounts and opportunities, creating visibility from deal close to project delivery
- **AI-Powered Notifications:** Smart notifications summarize project updates and suggest next actions (100 AI requests/month on PRO plan)
- **Team Collaboration:** Multi-user task assignment, watchers system, and comment threads keep everyone aligned

**Target Release:** Q2 2025

---

## 2. Problem Statement

### Current Situation
Sales teams close deals, then hand off to delivery teams using separate project management tools (Trello, Asana, Jira). Customer context gets lost in translation - delivery teams don't know what was promised, sales teams can't track project progress, and customers receive inconsistent experiences. Context switching between CRM and PM tools wastes 2-3 hours per person daily.

### Why This Matters
Fragmented tools create operational chaos:
- **Revenue at Risk:** 28% of projects fail due to poor communication between sales and delivery (PMI Pulse Report)
- **Customer Dissatisfaction:** 40% of customers report "expectations don't match reality" when sales promises aren't visible to delivery
- **Team Inefficiency:** Average knowledge worker switches between 10 apps 25 times per day, losing 4 hours weekly to context switching (RescueTime Study)
- **Lost Opportunities:** Delivery teams can't identify upsell/renewal risks without CRM context

### Success Vision
A sales rep closes a $50K deal with Acme Corp. They click "Create Project" directly from the opportunity record. Project board pre-populated with standard deliverables (onboarding, training, implementation). Delivery team assigned automatically via template. Customer Success Manager watches project to identify renewal timing. Task "Schedule kickoff meeting" auto-assigned to Account Executive with due date 3 days post-close. AI notification to owner: "3 tasks overdue on Acme Corp project - Schedule 1:1 with delivery lead." All project activity visible in account timeline. No app switching, zero lost context.

---

## 3. Target Users/Personas

### Primary Persona: Project Manager / Delivery Lead
- **Role:** Oversees execution of customer projects post-sale
- **Goals:**
  - Track all project deliverables and milestones in one place
  - Assign tasks to team members with clear due dates and priorities
  - Identify blocked tasks or at-risk projects before customers complain
  - Report project status to stakeholders without manual report creation
- **Pain Points:**
  - No visibility into sales promises or customer context from deal
  - Using separate tools (Jira + CRM) requires constant manual sync
  - Can't see which projects are tied to which accounts or revenue
  - Manually create project plans from scratch for every new customer
- **Use Cases:**
  - Creating project from template when deal closes
  - Daily standup: Reviewing Kanban board to identify blockers
  - Weekly status update: Exporting task completion metrics for exec review
  - Customer escalation: Drilling into account history to understand promises

### Secondary Persona: Account Executive (AE)
- **Role:** Closes deals and maintains customer relationships
- **Goals:**
  - Hand off projects to delivery with full context (scope, timeline, budget)
  - Track project progress to inform renewal conversations
  - Identify upsell opportunities based on project bottlenecks
  - Prove to customers that promises are being delivered
- **Pain Points:**
  - Delivery team asks "what did you promise?" weeks after deal close
  - Can't see project status without asking delivery team
  - Miss renewal upsell timing because project completion date unknown
  - Customers say "I thought you said..." but no record of commitments
- **Use Cases:**
  - Creating project immediately after opportunity marked "Won"
  - Monthly check-in: Reviewing project progress before customer call
  - Renewal planning: Seeing project completion date to time renewal outreach
  - Customer reference request: Finding successfully completed projects

### Tertiary Persona: Team Member / Contributor
- **Role:** Individual contributor executing project tasks
- **Goals:**
  - See all my assigned tasks across projects in one view
  - Understand task priority and due dates to manage workload
  - Collaborate with teammates via comments and document sharing
  - Mark tasks complete and see progress toward project goals
- **Pain Points:**
  - Tasks scattered across Slack, email, spreadsheets, PM tools
  - Don't know which tasks are urgent vs. "someday"
  - Can't see dependencies (blocking other teammates)
  - No context on why task matters (what customer, what revenue)
- **Use Cases:**
  - Morning routine: Reviewing "My Tasks" view sorted by due date
  - Task execution: Uploading deliverable document, marking task complete
  - Collaboration: Asking question in task comment thread
  - Reporting: Manager reviews my task completion rate

### Quaternary Persona: Customer Success Manager (CSM)
- **Role:** Ensures customers achieve goals post-sale
- **Goals:**
  - Monitor project health to identify at-risk accounts
  - Coordinate with delivery team on customer escalations
  - Track onboarding completion as leading indicator for renewal
  - Identify expansion opportunities based on successful delivery
- **Pain Points:**
  - Can't see project status without bothering delivery team
  - Projects delayed without anyone notifying CSM
  - No single source of truth on customer project history
- **Use Cases:**
  - Weekly account reviews: Checking project completion % for renewals
  - Quarterly business reviews: Showing customer project milestones achieved
  - Escalation handling: Reviewing project tasks to identify delays
  - Upsell planning: Seeing project scope to propose Phase 2

---

## 4. Functional Requirements

### 4.1 Core Features

#### Feature 1: Project Creation & Management
**Description:** Create projects with title, description, assigned users, linked accounts, and custom fields. Projects act as containers for Kanban boards and tasks.

**User Stories:**
- As a PM, I want to create a project linked to an account so I have customer context
- As an AE, I want to create a project from an opportunity so I don't lose deal details
- As a PM, I want to set project visibility (public, private, shared with specific users) so I control access
- As an owner, I want to mark projects as favorites so I can quickly access active projects

**Specifications:**
- **Boards Model (Project Container):**
  - `id`: ObjectId primary key
  - `organizationId`: Foreign key (multi-tenancy)
  - `title`: String (required, 2-100 characters, e.g., "Acme Corp - Implementation")
  - `description`: String (optional, markdown supported, e.g., project scope, goals)
  - `user`: User ObjectId (project owner, required)
  - `icon`: String (emoji icon, e.g., "🚀", "📊", "✅")
  - `favourite`: Boolean (star project for quick access)
  - `favouritePosition`: Integer (sort order in favorites list)
  - `position`: Integer (sort order in all projects list)
  - `visibility`: String ("public", "private", "shared") - default "public"
  - `sharedWith`: Array of User ObjectIds (for "shared" visibility)
  - `watchers`: Array of User ObjectIds (multi-user following system)
  - `createdAt`, `createdBy`, `updatedAt`, `updatedBy`: Audit fields

- **Project Creation Flow:**
  1. User clicks "New Project" button (from projects list or account detail page)
  2. Modal form:
     - Title (required, auto-focus)
     - Description (optional, rich text editor)
     - Icon picker (emoji selector, default 📋)
     - Owner (dropdown, defaults to current user)
     - Visibility (radio buttons: Public, Private, Shared)
     - Shared With (multi-select user dropdown, visible if "Shared" selected)
     - Link to Account (optional, typeahead search)
  3. On save:
     - Create Boards record
     - Create default sections ("To Do", "In Progress", "Done")
     - Add creator as watcher automatically
     - Redirect to project board view
     - Show success toast: "Project created successfully"

- **Project Detail Page Components:**
  - Header: Title (editable inline), icon, owner avatar, watchers avatars, favorite star button
  - Tabs: Board (Kanban), Tasks (list view), Activity (timeline), Settings
  - Sidebar: Description (markdown rendered), linked account (if any), created date, last updated

- **Project Operations:**
  - **Edit Project:** Inline editing for title, modal for other fields
  - **Delete Project:** Confirmation modal ("This will delete all tasks. Are you sure?"), soft delete with 30-day recovery
  - **Duplicate Project:** Copy project structure (sections + task templates) without tasks
  - **Archive Project:** Set status=ARCHIVED (hidden from default view, searchable in "Archived Projects")
  - **Add Watcher:** Dropdown to add users, watchers receive notifications on project updates
  - **Remove Watcher:** Remove users from watchers array

**UI/UX Considerations:**
- Project card grid view (default) with columns: thumbnail (icon + first section color), title, owner, tasks count (e.g., "12/20 completed"), last updated
- Project list view (alternative) with sortable table columns
- Favorites section at top of projects page (starred projects)
- Quick-create modal accessible from global "+" menu
- Drag-and-drop to reorder projects in favorites

---

#### Feature 2: Kanban Boards with Drag-and-Drop
**Description:** Visual Kanban boards with customizable sections (columns) and drag-and-drop task movement. Each board represents workflow stages (e.g., "Backlog", "In Progress", "Review", "Done").

**User Stories:**
- As a PM, I want to see all project tasks in a Kanban board so I can visualize workflow
- As a user, I want to drag tasks between sections so I can update status quickly
- As a PM, I want to customize section names so I match my team's workflow
- As a team member, I want to see task cards with key info (assignee, due date, priority) without clicking

**Specifications:**
- **Sections Model (Board Columns):**
  - `id`: ObjectId
  - `organizationId`: Foreign key
  - `board`: Board ObjectId (foreign key)
  - `title`: String (required, e.g., "To Do", "In Progress", "Done")
  - `position`: Integer (sort order, left to right)
  - `tasks`: Relation to Tasks model (one-to-many)

- **Default Sections (Created with New Project):**
  1. "To Do" (position: 0)
  2. "In Progress" (position: 1)
  3. "Done" (position: 2)

- **Kanban Board Layout:**
  - Horizontal scrollable board with sections as columns
  - Each section shows:
    - Section title (editable inline)
    - Task count badge (e.g., "5 tasks")
    - "+ Add Task" button at bottom
  - Task cards within section:
    - Task title (bold, 2 lines max with ellipsis)
    - Assignee avatar (bottom-left)
    - Priority color indicator (left border: red=high, yellow=medium, gray=low)
    - Due date badge (top-right, red if overdue)
    - Comment count icon (if comments exist)
    - Document attachment icon (if documents attached)

- **Drag-and-Drop Functionality:**
  - Library: @dnd-kit/core or react-beautiful-dnd
  - Drag task card to another section → Update task `section` field + `position`
  - Reorder tasks within section → Update `position` field
  - Visual feedback: Ghost card during drag, drop zone highlights
  - Optimistic UI updates (instant, sync to DB in background)
  - Conflict resolution: If two users drag same task simultaneously, last write wins + refresh

- **Section Management:**
  - **Add Section:** Click "+ Add Section" button (right of last section), inline input appears, press Enter to save
  - **Rename Section:** Click section title, inline editing, press Enter or blur to save
  - **Delete Section:** Click "..." menu on section, select "Delete", confirmation modal ("Move tasks to which section?" dropdown), tasks moved before deletion
  - **Reorder Sections:** Drag section header horizontally to reorder

**UI/UX Considerations:**
- Horizontal scroll for boards with many sections (6+ sections)
- Section color coding (customizable per section, pastels for visual distinction)
- Compact vs. expanded card view toggle (show/hide description, tags)
- Keyboard navigation (arrow keys to move between tasks, Enter to open, Escape to close)
- Empty state: "No tasks yet. Click + to add your first task."

---

#### Feature 3: Task Management with Assignments & Due Dates
**Description:** Create, edit, assign, and prioritize tasks within project boards. Tasks include title, description, assignee, due date, priority, tags, comments, and document attachments.

**User Stories:**
- As a PM, I want to create tasks with detailed descriptions so team knows requirements
- As a team member, I want to see all my assigned tasks across projects so I manage workload
- As a PM, I want to set task priorities so team focuses on urgent work
- As any user, I want to comment on tasks so I can ask questions and provide updates

**Specifications:**
- **Tasks Model:**
  - `id`: ObjectId
  - `organizationId`: Foreign key
  - `title`: String (required, 2-200 characters)
  - `content`: String (optional, markdown supported, task description/notes)
  - `section`: Section ObjectId (required, defines which column task appears in)
  - `user`: User ObjectId (assignee, nullable - unassigned tasks allowed)
  - `priority`: String enum ("low", "medium", "high") - default "medium"
  - `position`: Integer (sort order within section)
  - `dueDateAt`: DateTime (optional, task deadline)
  - `tags`: JSON (array of tag names, e.g., ["bug", "urgent", "customer-facing"])
  - `likes`: Integer (like count, future feature)
  - `taskStatus`: Enum (ACTIVE, PENDING, COMPLETE) - default ACTIVE
  - `documentIDs`: Array of Document ObjectIds (attached files)
  - `createdAt`, `createdBy`, `updatedAt`, `updatedBy`: Audit fields
  - Relations: `comments` (one-to-many to tasksComments), `documents` (many-to-many)

- **Task Creation Flow:**
  1. Click "+ Add Task" button in section
  2. Quick-create: Inline input appears at top of section, type title, press Enter → Task created with defaults
  3. Full-create: Click "Create Detailed Task" → Modal opens:
     - Title (required, auto-focus)
     - Description (markdown editor with preview)
     - Assignee (user dropdown with avatar search)
     - Due date (date picker with calendar, default: none)
     - Priority (dropdown: Low, Medium, High)
     - Tags (multi-select with autocomplete from existing tags)
     - Attach documents (file picker, max 10 files per task)
  4. On save: Task appears at top of section, success toast

- **Task Detail Modal (Click Task Card):**
  - Header: Task title (editable inline), status dropdown (Active, Pending, Complete), close button
  - Metadata bar: Assignee (changeable), due date (editable), priority (changeable)
  - Description section: Markdown editor with preview toggle
  - Comments section: Threaded comments with @mention support (notify mentioned users)
  - Documents section: List of attached documents with preview/download buttons
  - Activity log: Timeline of changes (created, assigned, status changed, due date updated)
  - Actions: Delete task, Duplicate task, Move to section (dropdown)

- **Task Operations:**
  - **Edit Task:** Click task card → Edit any field in modal
  - **Assign Task:** Click assignee avatar → User dropdown → Select user → Auto-save
  - **Complete Task:** Check checkbox on task card OR set taskStatus=COMPLETE → Moves to "Done" section automatically
  - **Delete Task:** "..." menu on task card → "Delete" → Confirmation modal → Soft delete
  - **Duplicate Task:** "..." menu → "Duplicate" → Creates copy with "(Copy)" suffix
  - **Move Task:** Drag-and-drop to section OR "Move to" dropdown in modal
  - **Attach Document:** File picker in task modal → Upload to DigitalOcean Spaces → Link to task

- **"My Tasks" View (Global Across All Projects):**
  - User navigates to Projects → My Tasks tab
  - Table view showing all tasks assigned to current user:
    - Columns: Task title, Project, Section, Due date, Priority, Status
    - Sortable by due date (default), priority, project
    - Filters: Status (Active, Pending, Complete), Due (Overdue, Today, This Week, All)
    - Grouped by: Project or Due date (toggle)
  - Quick actions: Mark complete, Change due date, Reassign

**UI/UX Considerations:**
- Task cards with visual hierarchy (title prominent, metadata subtle)
- Priority color coding: Red border (high), yellow border (medium), no border (low)
- Overdue badge: Red "Overdue by 3 days" badge on cards past due date
- Comment count badge: "💬 5" showing unread comments
- Empty state: "No tasks assigned to you yet."
- Keyboard shortcut: Press "T" to create task in current section

---

#### Feature 4: Task Comments & Collaboration
**Description:** Threaded comment system on tasks enabling team communication, @mentions for notifications, and activity history.

**User Stories:**
- As a team member, I want to comment on tasks so I can ask questions inline
- As a PM, I want to @mention teammates so they see my question
- As any user, I want to see comment history so I understand task evolution
- As an assignee, I want notifications when someone comments on my task

**Specifications:**
- **tasksComments Model:**
  - `id`: ObjectId
  - `comment`: String (required, 1-10,000 characters, markdown supported)
  - `task`: Task ObjectId (foreign key)
  - `user`: User ObjectId (commenter, foreign key)
  - `createdAt`: DateTime
  - `assigned_task`: Tasks relation (foreign key)
  - `assigned_user`: Users relation (foreign key)

- **Comment Thread UI (Task Modal):**
  - Comments section below task description
  - Chronological list (newest first or oldest first, user preference)
  - Each comment shows:
    - Commenter avatar + name
    - Timestamp (relative, e.g., "2 hours ago")
    - Comment text (markdown rendered, @mentions hyperlinked)
    - Edit button (if commenter = current user, visible for 5 minutes after posting)
    - Delete button (if commenter = current user OR project owner)
  - Comment input box at bottom:
    - Markdown toolbar (bold, italic, link, code, list)
    - @mention autocomplete (type "@" + name, dropdown appears)
    - "Add Comment" button (or Cmd+Enter to submit)

- **@Mention Functionality:**
  - Type "@" in comment input → Dropdown shows organization users (filtered by typing)
  - Select user → Insert "@UserName" into comment
  - On comment save: Parse mentions, create notification for each mentioned user
  - Mentioned users receive: In-app notification + email ("@YourName mentioned you in a task comment")

- **Comment Notifications:**
  - Task assignee receives notification on new comment (unless they're the commenter)
  - Project watchers receive notification on new comment (configurable)
  - Mentioned users receive notification regardless of role
  - Email notification template: "New comment on '[Task Title]': [First 100 chars of comment]"

- **Edit/Delete Comments:**
  - Edit: Available for 5 minutes after posting, shows "(edited)" badge after save
  - Delete: Permanent deletion, requires confirmation modal
  - Audit log: Track comment deletions for compliance

**UI/UX Considerations:**
- Real-time comments (websocket updates, see new comments without refresh)
- Comment count badge on task card (e.g., "💬 3")
- Unread comments indicator (bold task titles if unread comments exist)
- Markdown preview toggle in comment editor
- Empty state: "No comments yet. Be the first to comment!"

---

#### Feature 5: AI-Powered Notifications
**Description:** OpenAI-powered smart notifications summarizing project updates and suggesting next actions. Available on PRO plan (100 AI requests/month).

**User Stories:**
- As a project owner, I want daily digest emails summarizing overdue tasks so I don't need to check board manually
- As a PM, I want AI to suggest next actions based on project status so I stay proactive
- As a team lead, I want weekly summary of team task completion so I can report to leadership
- As any user, I want AI to identify blockers or at-risk projects before they become issues

**Specifications:**
- **AI Notification Types:**
  1. **Daily Digest (Email):** Sent at 8am user's timezone, includes:
     - Overdue tasks count with list
     - Tasks due today with assignees
     - Recently completed tasks (last 24 hours)
     - AI-generated summary: "You have 3 overdue tasks. Priority: Schedule kickoff meeting with Acme Corp."
  2. **Project Risk Alert:** Triggered when:
     - >50% of tasks overdue
     - No tasks completed in 7 days (stale project)
     - AI message: "Project '[Name]' appears at risk. Consider reviewing with team."
  3. **Weekly Summary (Email):** Sent Monday 8am, includes:
     - Tasks completed last week (count + %)
     - Tasks added last week
     - Active projects count
     - AI-generated insights: "Your team completed 23 tasks last week, 15% above average. Top contributor: John Doe (8 tasks)."
  4. **Smart Suggestions (In-App):** When user opens project board:
     - AI tooltip: "Consider assigning 'Design review' to Sarah - she completed similar tasks 2x faster than average."
     - AI tooltip: "3 tasks in 'In Progress' for >14 days. Move to 'Blocked'?"

- **AI Implementation:**
  - Use OpenAI GPT-4 or GPT-3.5-turbo for text generation
  - Prompt template: "Summarize this project status in 2 sentences: [JSON task data]. Highlight risks and suggest next actions."
  - Rate limiting: 100 AI requests/month on PRO plan (tracked in OrganizationUsage)
  - Fallback: If AI unavailable, send standard notification without AI summary

- **User Preferences (Settings):**
  - Enable/disable AI notifications (toggle)
  - Email frequency: Daily, Weekly, Never
  - Notification channels: Email, In-app, Both
  - AI suggestion aggressiveness: Conservative (only critical alerts), Balanced, Proactive (all suggestions)

- **AI Notification Settings (per user):**
  - Stored in `Users.settings` JSON field:
    ```json
    {
      "aiNotifications": {
        "enabled": true,
        "dailyDigest": true,
        "weeklyDigest": true,
        "riskAlerts": true,
        "smartSuggestions": false
      }
    }
    ```

**UI/UX Considerations:**
- AI-generated content clearly labeled with "✨ AI Summary" badge
- User can dismiss AI suggestions (with feedback: "Helpful" / "Not helpful")
- AI notification preview in settings (sample email shown before enabling)
- Quota indicator: "89 / 100 AI requests used this month"

---

### 4.2 Secondary Features

#### Feature 6: Project Templates
**Description:** Save project boards as templates to quickly create new projects with pre-defined sections and task lists.

**Specifications:**
- "Save as Template" button on project settings
- Template library (per organization, global defaults for admins)
- Template includes: Sections, task titles (no assignments or due dates), description templates

#### Feature 7: Task Dependencies
**Description:** Mark tasks as "blocked by" other tasks, preventing status changes until blocker resolved.

**Specifications:**
- Task modal: "Blocked by" field (typeahead search for tasks)
- Task card shows "🔒 Blocked" badge if dependencies unresolved
- Auto-notify assignee when blocker completed

#### Feature 8: Time Tracking
**Description:** Log time spent on tasks for project costing and resource planning.

**Specifications:**
- Task modal: "Log Time" button → Enter hours + notes → Save
- Time log stored in JSON field on task
- Project report: Total time logged per user, per project

#### Feature 9: Recurring Tasks
**Description:** Create tasks that auto-replicate on schedule (daily, weekly, monthly).

**Specifications:**
- Task modal: "Repeat" dropdown (None, Daily, Weekly, Monthly)
- Cron job creates new task on schedule (copies title, description, assignee)
- Original task marked as template (hidden from board)

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **Board Load Time:** Kanban board loads in <1.5 seconds for projects with 500 tasks
- **Drag-and-Drop Latency:** Task position updates in <200ms (optimistic UI)
- **Task Search:** Search across all tasks returns results in <500ms
- **My Tasks View:** Loads all user tasks (<1,000) in <1 second
- **Real-Time Updates:** Websocket updates deliver new comments/tasks in <2 seconds

### 5.2 Security
- **Project Visibility:** Private projects only visible to owner + sharedWith users
- **RBAC Enforcement:** Viewers cannot create/edit tasks, Members can only edit assigned tasks
- **Audit Logging:** All task operations logged (create, edit, delete, status change)
- **Document Access:** Task documents inherit project visibility settings

### 5.3 Scalability
- **Tasks per Project:** Support 1,000 tasks per project without performance degradation
- **Projects per Organization:** Support 10,000 projects per organization
- **Concurrent Users:** 100 users viewing/editing same project board without conflicts

### 5.4 Accessibility
- **WCAG AA Compliant:** Keyboard navigation, screen reader support, focus indicators
- **Keyboard Shortcuts:** Arrow keys to navigate tasks, Enter to open, Escape to close
- **Color Blind Friendly:** Priority indicators use shapes + colors (not color alone)

---

## 6. Acceptance Criteria

### Project Management
- [ ] User can create project with title, description, owner, visibility, icon
- [ ] User can link project to account (optional)
- [ ] User can mark project as favorite (shows in favorites section)
- [ ] User can add/remove watchers to project
- [ ] User can delete project (soft delete, confirmation modal)
- [ ] User can archive project (hidden from default view)

### Kanban Boards
- [ ] New project includes default sections ("To Do", "In Progress", "Done")
- [ ] User can add custom sections with inline editing
- [ ] User can rename sections with inline editing
- [ ] User can delete sections (with "move tasks to" confirmation)
- [ ] User can reorder sections via drag-and-drop
- [ ] User can drag tasks between sections (position updates immediately)
- [ ] User can reorder tasks within sections

### Task Management
- [ ] User can create task with quick-create (title only) or full-create (all fields)
- [ ] User can assign task to user (dropdown with avatar search)
- [ ] User can set task due date (calendar picker)
- [ ] User can set task priority (low, medium, high)
- [ ] User can add tags to task (multi-select with autocomplete)
- [ ] User can attach documents to task (file upload)
- [ ] User can mark task as complete (checkbox or status dropdown)
- [ ] User can view "My Tasks" across all projects (sortable by due date, priority)
- [ ] Task cards show assignee avatar, priority color, due date, comment count
- [ ] Overdue tasks show red "Overdue" badge

### Comments & Collaboration
- [ ] User can comment on tasks (markdown supported)
- [ ] User can @mention other users (autocomplete dropdown)
- [ ] Mentioned users receive notification (email + in-app)
- [ ] Task assignee receives notification on new comment
- [ ] User can edit own comments (within 5 minutes)
- [ ] User can delete own comments (confirmation modal)
- [ ] Comments show commenter avatar, name, timestamp, text

### AI Notifications
- [ ] Daily digest email sent at 8am user's timezone (overdue tasks, tasks due today, AI summary)
- [ ] Project risk alert triggered when >50% tasks overdue or no activity in 7 days
- [ ] Weekly summary email sent Monday 8am (tasks completed, AI insights)
- [ ] Smart suggestions shown in-app (task assignment recommendations)
- [ ] User can enable/disable AI notifications in settings
- [ ] AI quota tracked (100 requests/month on PRO plan)

### Performance
- [ ] Kanban board with 500 tasks loads in <1.5 seconds
- [ ] Drag-and-drop updates task position in <200ms (optimistic UI)
- [ ] "My Tasks" view with 1,000 tasks loads in <1 second

---

## 7. Success Metrics

| Metric Category | Metric | Target | Measurement Method |
|----------------|--------|--------|-------------------|
| **Adoption** | Projects per organization | 10+ active projects | Database count of ACTIVE boards |
| **Engagement** | Daily active users (projects module) | 60% of org members | Users viewing/editing projects daily |
| **Task Completion** | Task completion rate | >70% tasks completed | (COMPLETE tasks / Total tasks) * 100 |
| **Collaboration** | Comments per task (avg) | 2+ | Mean tasksComments count |
| **AI Adoption** | AI notification opt-in rate | >50% | Users with aiNotifications.enabled=true |
| **Productivity** | Tasks per user per week | 8+ | Mean tasks completed per user weekly |
| **Project Health** | % of projects on-track (no overdue tasks) | >80% | Projects with 0 overdue tasks |

**Key Performance Indicators (KPIs):**
1. **CRM-to-Project Conversion:** 50%+ of won opportunities create linked projects
2. **Cross-Functional Visibility:** 70%+ of projects have watchers from multiple teams (sales + delivery)
3. **AI Value Delivery:** 60%+ of users rate AI notifications as "helpful" or "very helpful"

---

## 8. Dependencies

### Internal Dependencies
| Dependency | Type | Status | Impact if Delayed |
|-----------|------|--------|------------------|
| Multi-Tenancy Module | Hard | Complete | Cannot enforce organizationId isolation |
| User Management | Hard | Complete | Cannot assign tasks or track owners |
| CRM Accounts Module | Soft | Complete | Cannot link projects to accounts |
| Document Management | Soft | In Progress | Cannot attach documents to tasks |

### External Dependencies
| Dependency | Provider | SLA | Risk Level |
|-----------|----------|-----|-----------|
| OpenAI API | OpenAI | 99.9% uptime | Medium (AI notifications fail gracefully) |
| MongoDB Atlas | MongoDB Inc | 99.95% uptime | Low (managed service) |
| Websocket Service | Vercel/self-hosted | 99.9% uptime | Medium (real-time updates degrade gracefully) |

---

## 9. Out of Scope

The following items are explicitly **NOT** included in this release:

- [ ] Gantt charts for project timeline visualization (future: project planning view)
- [ ] Resource allocation and capacity planning (future: team management)
- [ ] Budget tracking per project (future: financial management)
- [ ] Client portal for external stakeholders (future: client collaboration)
- [ ] Mobile native apps (responsive web only for v1)
- [ ] Integration with external PM tools (Jira, Asana sync) (future: integration hub)
- [ ] Advanced reporting (burndown charts, velocity metrics) (future: analytics module)
- [ ] Custom workflows beyond Kanban (Scrum, Waterfall) (future: workflow builder)
- [ ] Task automation rules (if X then Y) (future: automation engine)

**Future Considerations:**
- Project portfolio management (cross-project dashboards)
- Resource leveling and conflict resolution
- Custom fields per project type (development projects vs. implementation projects)

---

## 10. Risks & Mitigation

| Risk | Probability | Impact | Mitigation Strategy | Owner |
|------|------------|--------|-------------------|-------|
| **Drag-and-Drop Conflicts:** Multiple users drag same task simultaneously | Medium | Medium | Optimistic UI + last write wins, show conflict toast, refresh board | Frontend Engineer |
| **OpenAI Quota Exceeded:** Organization hits 100 AI requests/month limit | High | Low | Graceful degradation (send standard notifications without AI), upgrade prompt | Product Manager |
| **Websocket Scaling:** Real-time updates fail at 100+ concurrent users | Medium | High | Redis pub/sub for scaling, fallback to polling (30s intervals) | Backend Engineer |
| **Performance Degradation:** Large boards (1,000+ tasks) load slowly | Medium | High | Virtualized scrolling (only render visible tasks), pagination option, archive old tasks | Performance Engineer |
| **Low Adoption:** Users continue using separate PM tools | High | High | Deep CRM integration (one-click project from opportunity), onboarding templates, user training | Product Manager |

**Risk Categories:**
- **Technical Risks:** Real-time sync conflicts, websocket reliability, OpenAI API availability
- **Business Risks:** Low adoption, feature parity with dedicated PM tools (Asana, Jira)
- **UX Risks:** Drag-and-drop complexity on mobile, information overload on task cards

---

## 11. Launch Requirements

### Pre-Launch Checklist

#### Development
- [ ] All acceptance criteria met (100% of checkboxes in section 6)
- [ ] Code review completed by 2+ engineers
- [ ] Unit tests passing with >90% coverage on task logic
- [ ] Integration tests passing for drag-and-drop workflows
- [ ] Performance testing completed with 1,000 tasks per board
- [ ] Security audit completed (project visibility, RBAC enforcement)

#### QA
- [ ] Functional testing completed for all project/board/task workflows
- [ ] Drag-and-drop testing on Chrome, Firefox, Safari (desktop + mobile)
- [ ] Real-time updates tested with 10 concurrent users
- [ ] AI notification testing (OpenAI integration, email delivery)
- [ ] Cross-browser testing (latest 2 versions)
- [ ] Mobile responsive testing (iOS Safari, Android Chrome)

#### Documentation
- [ ] User documentation: "Getting Started with Projects" guide
- [ ] User documentation: "Using Kanban Boards" tutorial
- [ ] User documentation: "AI Notifications Setup"
- [ ] Admin guide: "Project Templates and Best Practices"
- [ ] API documentation: Projects and tasks endpoints

#### Operations
- [ ] Monitoring configured: Board load time, drag-and-drop latency, AI API success rate
- [ ] Alerting configured: AI quota exhaustion, websocket failures, task creation errors
- [ ] OpenAI API key configured in production
- [ ] Websocket service deployed and tested (Vercel or self-hosted)
- [ ] Background jobs deployed: AI notifications, recurring tasks

#### Legal & Compliance
- [ ] OpenAI Data Processing Agreement signed
- [ ] Privacy policy updated (AI processing disclosure)
- [ ] Audit logs configured for task operations

#### Go-to-Market
- [ ] Marketing materials: "Projects Module" landing page
- [ ] Sales enablement: Demo script for projects + CRM integration
- [ ] Customer support training: Projects troubleshooting guide
- [ ] Beta testing completed with 10 organizations (feedback incorporated)

---

## Appendix

### A. Database Schema

See [prisma/schema.prisma](../../prisma/schema.prisma):
- `Boards` model (lines 375-400) - Projects
- `Sections` model (lines 600-614) - Kanban columns
- `Tasks` model (lines 629-657)
- `tasksComments` model (lines 687-698)

### B. API Specifications

**Key Endpoints:**
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/[id]` - Get project with sections and tasks
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Soft delete project
- `POST /api/projects/[id]/sections` - Create section
- `PUT /api/sections/[id]` - Update section (rename, reorder)
- `DELETE /api/sections/[id]` - Delete section
- `POST /api/tasks` - Create task
- `PUT /api/tasks/[id]` - Update task (assign, due date, priority, position)
- `DELETE /api/tasks/[id]` - Delete task
- `POST /api/tasks/[id]/comments` - Add comment
- `GET /api/tasks/my-tasks` - Get all tasks assigned to current user

### C. Related Documents
- [CRM Accounts PRD](./PRD-CRM-ACCOUNTS.md)
- [Documents PRD](./PRD-DOCUMENTS.md)
- [Technical Design: Real-Time Architecture](../ARCHITECTURE.md)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-17 | Product Team | Initial draft based on NextCRM projects module |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Manager | TBD | | |
| Engineering Lead | TBD | | |
| Design Lead | TBD | | |
