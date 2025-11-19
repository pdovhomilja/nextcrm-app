# Projects Guide - Project Management & Task Tracking

**Last Updated:** 2024-11-17
**Read Time:** 12-15 minutes
**For:** Project managers, team leaders, collaborators

---

## Table of Contents

1. [Projects Overview](#projects-overview)
2. [Creating & Setting Up Projects](#creating--setting-up-projects)
3. [Kanban Boards](#kanban-boards)
4. [Task Management](#task-management)
5. [Team Collaboration](#team-collaboration)
6. [AI Features](#ai-features)
7. [Project Analytics](#project-analytics)
8. [Common Workflows](#common-workflows)

---

## Projects Overview

### What is a Project in NextCRM?

A **project** in NextCRM is a structured workspace for organizing work, tracking progress, and collaborating with your team. Each project contains:
- A **Kanban board** with customizable columns (sections)
- **Tasks** that move through workflow stages
- **Team members** with assigned responsibilities
- **Activity timeline** showing all changes and updates
- **Documents** and attachments
- **Analytics** showing progress and velocity

**Example projects:**
- "Q4 Website Redesign"
- "Acme Corp Implementation"
- "Marketing Campaign - Holiday 2024"
- "Product Launch - Feature X"
- "Event Planning - Annual Conference"

### Project vs. Task

**Project** = Container for related work (e.g., "Website Redesign")
- Has a start and end date
- Contains multiple tasks
- Involves multiple team members
- Tracked at high level

**Task** = Individual unit of work (e.g., "Design homepage mockup")
- Belongs to a project
- Assigned to one person
- Has a due date and priority
- Tracked at granular level

**Think of it this way:**
- **Project** = Novel (the complete book)
- **Task** = Chapter (individual section of work)

### When to Use Projects

Use projects for:
- **Client deliverables** - Implementation, consulting, design work
- **Internal initiatives** - Process improvement, system upgrades
- **Marketing campaigns** - Content creation, event coordination
- **Product development** - Feature releases, sprints
- **Events** - Conference planning, webinars, trade shows

**Don't create projects for:**
- Single one-off tasks (use standalone tasks instead)
- Very simple work (<5 tasks) (use task lists instead)
- Work that doesn't need collaboration (use personal to-do lists)

### Kanban Board Methodology

NextCRM uses **Kanban boards** to visualize work:

**What is Kanban?**
- Visual workflow management system
- Work items (tasks) move through stages (columns)
- Originated from Toyota's manufacturing process
- Now widely used in software development and project management

**Key Kanban Principles:**
1. **Visualize work** - See all tasks at a glance
2. **Limit work in progress** - Don't overload team members
3. **Manage flow** - Keep tasks moving through stages
4. **Make process explicit** - Clear rules for each stage
5. **Continuous improvement** - Optimize workflow over time

**Basic Kanban Board Structure:**
```
[ To Do ]  →  [ In Progress ]  →  [ Review ]  →  [ Done ]
    10            3                  2             45
```

**Pro Tip:** Kanban works best when you limit work-in-progress (WIP). Don't let "In Progress" column overflow—finish tasks before starting new ones.

### Common Project Workflows

**Workflow 1: Software Development Sprint**
1. Create project: "Sprint 23 - User Authentication"
2. Create sections: Backlog → To Do → In Progress → Code Review → Testing → Done
3. Add user stories as tasks
4. Team pulls tasks from "To Do" as capacity allows
5. Tasks flow through stages until complete
6. Sprint review at end (analyze velocity and completion rate)

**Workflow 2: Marketing Campaign**
1. Create project: "Holiday Email Campaign 2024"
2. Create sections: Ideas → Planning → Content Creation → Design → Review → Scheduled → Sent
3. Add tasks: "Write email copy", "Design banner", "Build email in tool", "Schedule send"
4. Assign tasks to copywriter, designer, email specialist
5. Track progress through stages
6. Analyze campaign performance after send

**Workflow 3: Client Implementation**
1. Create project: "Acme Corp - CRM Implementation"
2. Link to CRM account (Acme Corp)
3. Create sections: Kickoff → Configuration → Data Migration → Training → Launch → Support
4. Add tasks with due dates aligned to project timeline
5. Assign tasks to implementation team
6. Customer success manager monitors progress
7. Mark complete when customer is live and trained

**Workflow 4: Event Planning**
1. Create project: "Annual Sales Kickoff 2025"
2. Create sections: Planning → Venue → Speakers → Marketing → Logistics → Event Day → Wrap-up
3. Add tasks with dependencies (e.g., "Book venue" before "Send invitations")
4. Set reminders for time-sensitive tasks
5. Use checklists for complex tasks ("Venue booking" includes subtasks)
6. Track budget in task descriptions
7. Conduct post-event retrospective

---

## Creating & Setting Up Projects

### Creating a New Project

**Step-by-Step:**

1. Navigate to **Projects** (main menu)
2. Click **+ New Project** button
3. Fill in project details:

**Basic Information:**
- **Project Title*** (required) - Descriptive name (e.g., "Q4 Website Redesign")
- **Description** - Project goals, scope, and context
  - What are we building/delivering?
  - Why is this project important?
  - What's the definition of success?

**Timeline:**
- **Start Date** - When project begins
- **End Date** - Target completion date
- **Status** - Active, On Hold, Completed, Cancelled

**Team:**
- **Project Owner*** (required) - Person responsible for overall project success
- **Team Members** - People working on this project (multi-select)
- **Visibility** - Who can see this project:
  - **Private** - Only owner and team members
  - **Team** - All organization members
  - **Public** - Everyone (including external stakeholders if sharing is enabled)

**Integrations:**
- **Linked Account** - Link to CRM account (for client projects)
- **Linked Opportunity** - Link to sales opportunity (track delivery against deal)

**Settings:**
- **Icon** - Choose emoji or icon to represent project
- **Favorite** - Mark as favorite to pin to top of project list

4. Click **Create Project**
5. Project is created with default sections (To Do, In Progress, Done)

**Screenshot Placeholder:** `[New Project Form - Example: "Acme Corp Implementation" with all fields filled, linked to CRM account]`

**Pro Tip:** Write a clear, detailed description during project creation. 3 months from now, new team members (or your future self) will thank you for the context.

### Customizing Project Templates

Create reusable project templates for common workflows:

**Creating a Template:**
1. Create a project with your ideal structure:
   - Define sections (columns)
   - Add template tasks with descriptions
   - Set default assignments and priorities
2. Navigate to **Projects → Templates**
3. Click **Save as Template**
4. Give template a name (e.g., "Client Implementation Template")
5. Template is saved and can be reused

**Using a Template:**
1. Click **+ New Project**
2. Click **Use Template** button
3. Select template from dropdown
4. Project is created with all sections and tasks pre-populated
5. Customize as needed for specific project

**Built-in Templates:**
- Software Development Sprint
- Marketing Campaign
- Client Onboarding
- Event Planning
- Product Launch
- Content Calendar

**Pro Tip:** If you run the same type of project repeatedly (e.g., client implementations), create a template. You'll save 30+ minutes of setup time per project.

### Custom Fields Per Project

Add project-specific custom fields (requires admin permissions):

1. Open project settings (gear icon)
2. Click **Custom Fields**
3. Click **+ Add Field**
4. Configure field:
   - **Field Name** - Label (e.g., "Budget")
   - **Field Type** - Text, Number, Date, Dropdown, Checkbox
   - **Required** - Yes/No
   - **Default Value** - Pre-filled value (optional)
5. Click **Save**
6. Custom field appears on all tasks in this project

**Common Custom Fields:**
- **Budget** (Number) - Allocated budget per task
- **Client Priority** (Dropdown) - P0, P1, P2, P3
- **Sprint** (Text) - Sprint number for agile teams
- **Estimate** (Number) - Time estimate in hours
- **Actual Time** (Number) - Time actually spent

**Pro Tip:** Don't go overboard with custom fields. Only add fields that you'll actually use for decision-making or reporting.

### Project Settings and Permissions

Configure project-level settings:

**Access Settings:**
1. Open project
2. Click **Settings** (gear icon)
3. Navigate to **Permissions** tab
4. Configure:
   - **Visibility** - Private, Team, Public
   - **Who can add tasks** - Owner only, Team members, Everyone
   - **Who can edit tasks** - Task assignee only, Team members, Everyone
   - **Who can delete tasks** - Owner only, Owner + assignee
   - **Who can invite members** - Owner only, Team members

**Notification Settings:**
1. Open **Settings → Notifications**
2. Configure:
   - **Notify on task creation** - Yes/No
   - **Notify on task assignment** - Yes/No
   - **Notify on task completion** - Yes/No
   - **Notify on comments** - Yes/No
   - **Notify on due date approaching** - 1 day, 3 days, 1 week before

**Integration Settings:**
1. Open **Settings → Integrations**
2. Configure:
   - **Slack** - Send notifications to Slack channel
   - **Email** - Daily digest or real-time notifications
   - **Calendar** - Sync tasks to Google Calendar or Outlook

**Pro Tip:** Set notification preferences to avoid overwhelming your team. For most projects, notify on assignment and mentions, but not on every minor update.

### Project Archive/Restore

Archive completed projects to keep your workspace clean:

**Archiving a Project:**
1. Open project
2. Click **Settings** → **Archive Project**
3. Confirm archive
4. Project is hidden from active projects list
5. All tasks are preserved (read-only)

**Viewing Archived Projects:**
1. Navigate to **Projects**
2. Click filter dropdown
3. Select **Show Archived**
4. Archived projects appear with "Archived" badge

**Restoring an Archived Project:**
1. View archived projects
2. Open archived project
3. Click **Restore Project** button
4. Project returns to active list

**Deleting a Project (Permanent):**
1. Open project (must be archived first)
2. Click **Settings → Delete Project**
3. Warning appears: "This cannot be undone. All tasks, comments, and attachments will be permanently deleted."
4. Type project name to confirm
5. Click **Delete Permanently**

**Pro Tip:** Archive projects instead of deleting them. You'll preserve project history for future reference (e.g., "How did we handle this last time?").

---

## Kanban Boards

### Board Structure and Sections

Every project has a Kanban board divided into **sections** (columns):

**Default Sections:**
- **To Do** - Tasks that need to be started
- **In Progress** - Tasks currently being worked on
- **Done** - Completed tasks

**Viewing the Board:**
1. Open project
2. Board view displays by default
3. Each section is a vertical column
4. Tasks are cards within columns
5. Scroll horizontally to see all sections

**Section Information Displayed:**
- Section name at top
- Task count (e.g., "In Progress (5)")
- Total task value (if using estimates)

**Screenshot Placeholder:** `[Kanban Board View - Showing 4 sections with task cards distributed across columns]`

### Creating Sections (Columns)

Customize your workflow by adding sections:

**Adding a New Section:**
1. Open project board
2. Click **+ Add Section** button (right side of board)
3. Enter section name (e.g., "Code Review")
4. Choose position:
   - Drag to desired position in workflow
   - Sections flow left-to-right (typical: To Do → In Progress → Done)
5. Click **Create**

**Common Section Naming Patterns:**

**Simple Workflow:**
- To Do → Doing → Done

**Software Development:**
- Backlog → To Do → In Progress → Code Review → Testing → Deployed → Done

**Marketing Campaign:**
- Ideas → Planning → In Progress → Review → Approved → Scheduled → Published

**Client Project:**
- Kickoff → Discovery → Design → Development → Testing → Client Review → Launch → Support

**Sales Process:**
- Prospecting → Qualified → Proposal → Negotiation → Closed Won

**Pro Tip:** Keep sections to 3-7 columns. Too many columns create confusion and slow down workflow. If you need more stages, consider whether subtasks would be better.

### Section Automation Rules

Automate actions when tasks move between sections:

**Setting Up Automation:**
1. Open project settings
2. Click **Automation** tab
3. Click **+ Add Rule**
4. Configure trigger and action:

**Example Automation Rules:**

**Rule: Auto-assign when moved to section**
- **Trigger:** Task moved to "Code Review"
- **Action:** Assign to "Tech Lead"
- **Use case:** Automatically route tasks to reviewer

**Rule: Auto-update status**
- **Trigger:** Task moved to "Done"
- **Action:** Set status to "Complete"
- **Use case:** Keep task status in sync with section

**Rule: Notify team**
- **Trigger:** Task moved to "Client Review"
- **Action:** Send notification to project owner
- **Use case:** Alert stakeholders when review is needed

**Rule: Set due date**
- **Trigger:** Task moved to "In Progress"
- **Action:** Set due date to 3 days from now
- **Use case:** Enforce completion timeline

**Rule: Add checklist**
- **Trigger:** Task moved to "Testing"
- **Action:** Add checklist template "QA Checklist"
- **Use case:** Ensure testing steps are followed

**Pro Tip:** Use automation sparingly. Over-automation creates confusion. Focus on high-value automations that save repetitive work.

### Drag-and-Drop Task Management

Move tasks through your workflow with drag-and-drop:

**Moving Tasks Between Sections:**
1. Click and hold task card
2. Drag to target section
3. Release to drop
4. Task moves to new section
5. Activity is logged automatically

**Reordering Tasks Within a Section:**
1. Click and hold task card
2. Drag up or down within same column
3. Release to drop
4. Task order is updated
5. Position is saved (persists for all team members)

**Bulk Moving Tasks:**
1. Select multiple tasks (checkboxes or Shift+click)
2. Click **Move to Section** button
3. Select target section
4. All selected tasks move together

**Keyboard Shortcuts for Task Movement:**
- `→` (Right arrow) - Move task to next section
- `←` (Left arrow) - Move task to previous section
- `↑` (Up arrow) - Move task up in current section
- `↓` (Down arrow) - Move task down in current section

**Pro Tip:** Task position within a section indicates priority (top = highest priority). Regularly reorder tasks so team knows what to work on next.

### Task Card Information

Each task card on the board displays:

**Always Visible:**
- **Task title** - Name of the task
- **Assignee avatar** - Profile picture of assigned person
- **Due date** - When task is due (color-coded: green = on time, yellow = due soon, red = overdue)
- **Priority indicator** - Icon showing priority (Low, Medium, High, Urgent)

**Conditionally Visible (if present):**
- **Comments count** - Number of comments (speech bubble icon)
- **Attachments count** - Number of attached files (paperclip icon)
- **Checklist progress** - "3/5 completed" if task has checklist
- **Tags** - Colored labels (e.g., "Bug", "Feature", "Design")
- **Estimate** - Time estimate (e.g., "4h" or "2 days")

**Card Color Coding:**
- **White background** - Normal task
- **Yellow tint** - Due within 3 days
- **Red tint** - Overdue
- **Green checkmark** - Completed (in "Done" section)
- **Blue border** - Task assigned to you

**Clicking a Task Card:**
- Click card to open task detail modal
- View full description, comments, attachments, activity
- Edit task fields without leaving board view

**Screenshot Placeholder:** `[Task Card Close-up - Showing all visible elements: title, assignee, due date, priority, comments, attachments, checklist progress]`

**Pro Tip:** Customize card display in project settings. Show only the fields your team needs to see at a glance to reduce visual clutter.

### Sorting and Filtering Sections

Focus on specific tasks:

**Filtering the Board:**
1. Click **Filter** button (top right)
2. Set filter criteria:
   - **Assigned to** - Show only tasks assigned to specific person
   - **Priority** - Show only High/Urgent tasks
   - **Due date** - Show tasks due this week
   - **Tags** - Show tasks with specific labels
3. Board updates to show only matching tasks
4. Clear filters to see all tasks again

**Sorting Tasks:**
1. Click **Sort** button (top right)
2. Select sort method:
   - **Manual** - Custom order (default)
   - **Priority** - High to Low
   - **Due Date** - Earliest to latest
   - **Created Date** - Newest or oldest first
   - **Title** - Alphabetical
3. Tasks reorder within sections
4. Sort applies to all sections

**Saved Views:**
- Save filter + sort combinations as views
- Quick access to common perspectives
- Example views:
  - "My tasks this week"
  - "Overdue tasks"
  - "High priority unassigned"
  - "Client-facing tasks"

**Pro Tip:** Create a saved view called "My Focus" that shows only your tasks, sorted by priority. Start each day by reviewing this view to plan your work.

### Board Views (List, Board, Timeline)

View your project in different formats:

**1. Board View (Kanban) - Default**
- Visual columns showing workflow stages
- Drag-and-drop task movement
- Best for: Active project management, daily standup

**2. List View (Table)**
- All tasks in a spreadsheet-style table
- Columns: Title, Assignee, Due Date, Priority, Status, Section
- Sortable and filterable
- Best for: Detailed task review, bulk editing, reporting

**Switching to List View:**
1. Click view selector (top right)
2. Select **List View**
3. Table displays all tasks
4. Click column headers to sort
5. Use inline editing to update fields quickly

**3. Timeline View (Gantt Chart)**
- Horizontal timeline showing task duration
- Visual representation of task dependencies
- Best for: Project planning, deadline management, identifying bottlenecks

**Switching to Timeline View:**
1. Click view selector (top right)
2. Select **Timeline View**
3. Tasks appear as horizontal bars on calendar
4. Length of bar = duration (start date to due date)
5. Drag bars to adjust dates
6. Draw lines to create dependencies (Task B starts after Task A completes)

**Screenshot Placeholder:** `[Three-way comparison image showing same project in Board View, List View, and Timeline View]`

**Pro Tip:** Use Board View for daily work, List View for bulk updates, and Timeline View for planning and reporting to stakeholders.

### Bulk Operations on Board

Perform actions on multiple tasks at once:

**Selecting Multiple Tasks:**
- **Method 1:** Click checkboxes on task cards
- **Method 2:** Shift+click to select range
- **Method 3:** Click **Select All** button (above board)

**Bulk Actions Available:**
1. **Move to Section** - Move all selected tasks to different section
2. **Assign to** - Assign all selected tasks to team member
3. **Change Priority** - Set priority for all selected tasks
4. **Add Tags** - Apply labels to all selected tasks
5. **Set Due Date** - Set same due date for all tasks
6. **Delete** - Delete all selected tasks (warning shown)

**Performing Bulk Action:**
1. Select tasks (checkboxes)
2. Click **Bulk Actions** button (appears when tasks selected)
3. Choose action from dropdown
4. Configure action (e.g., select assignee)
5. Click **Apply**
6. Confirmation shown with count of updated tasks

**Use Cases:**
- Reassign all tasks when team member goes on vacation
- Move entire section to "Done" at end of sprint
- Set due dates for all tasks in upcoming milestone
- Tag all customer-facing tasks with "Client Deliverable"

**Pro Tip:** Before bulk deleting tasks, export to CSV first (backup). Accidental bulk delete is painful to recover from without a backup.

---

## Task Management

### Creating Tasks Within Projects

Add work items to your project:

**Quick Add (From Board):**
1. Open project board
2. Click **+ Add Task** button in target section
3. Enter task title
4. Press Enter to create
5. Task appears in section with default settings

**Detailed Add (Full Form):**
1. Click **+ New Task** button (top right)
2. Fill in task details:

**Basic Information:**
- **Title*** (required) - Clear, actionable task name
  - Good: "Design homepage mockup for mobile"
  - Bad: "Design stuff"
- **Description** - Detailed context
  - What needs to be done?
  - Why is this important?
  - Any constraints or requirements?
  - Links to reference materials

**Assignment:**
- **Assignee** - Person responsible (dropdown)
- **Section** - Which column task starts in
- **Project*** (required) - Auto-filled if creating from project

**Timeline:**
- **Due Date** - When task should be completed
- **Start Date** - When work can begin (optional)
- **Estimate** - How long task will take (hours or days)

**Priority:**
- **Low** - Nice to have, not urgent
- **Medium** - Normal priority (default)
- **High** - Important, prioritize this
- **Urgent** - Critical, drop everything

**Tags:**
- Add labels for categorization (e.g., "Bug", "Feature", "Design", "Backend")
- Use tags to filter and group related tasks

3. Click **Create Task**

**Screenshot Placeholder:** `[New Task Form - Example: "Design homepage mockup for mobile" with all fields filled, due date 5 days out, assigned to designer, High priority]`

**Pro Tip:** Write task titles as action verbs (Design, Build, Review, Send, Schedule). This makes it clear what needs to be done at a glance.

### Task Fields Explained

**Task Title**
- Clear, specific description of work
- Keep under 60 characters for readability
- Start with action verb (Design, Build, Review, etc.)

**Task Description**
- Detailed explanation of work
- Include acceptance criteria ("Done means...")
- Link to related documents, mockups, tickets
- Use formatting (bold, bullets, code blocks)

**Assignee**
- Person responsible for completing the task
- Only one assignee per task (clear ownership)
- If multiple people needed, break into subtasks

**Due Date and Reminders**
- When task should be completed
- Assignee receives reminder notification:
  - 1 day before due date (default)
  - Morning of due date
  - When overdue (daily until completed)

**Priority (Low, Medium, High, Urgent)**
- **Low** - Nice to have, no timeline pressure
- **Medium** - Normal work, complete in reasonable timeframe (default)
- **High** - Important to business, prioritize over Medium tasks
- **Urgent** - Critical, drop other work to complete this

**Priority Guidelines:**
- Don't mark everything as Urgent (creates "priority inflation")
- Use Urgent sparingly (5-10% of tasks max)
- High priority = 20-30% of tasks
- Most tasks should be Medium

**Estimate (Hours/Days to Complete)**
- How long you think task will take
- Used for capacity planning and sprint velocity
- Enter in hours (e.g., 4h, 0.5h, 8h)
- System tracks Actual Time and compares to estimate

**Actual Time Spent**
- Time actually worked on task
- Manually entered or tracked with timer
- Used to improve future estimates
- Helps identify tasks that take longer than expected

**Pro Tip:** Consistently estimating tasks (even if estimates are wrong at first) trains your brain to better predict task duration. After 3-6 months, your estimates will become much more accurate.

### Task Status Workflow (TO DO → IN PROGRESS → DONE)

Tasks progress through status states:

**Status: TO DO (Active)**
- Task is on the list but work hasn't started
- Assignee can start when ready
- Shows in "To Do" section by default

**Status: IN PROGRESS (Doing)**
- Work has actively begun
- Assignee is currently working on this
- Shows in "In Progress" section by default
- Should have recent activity (comments, updates)

**Status: DONE (Complete)**
- Work is finished and ready to ship/deploy/deliver
- No further action required
- Shows in "Done" section
- Timestamp recorded for analytics

**Status: PENDING**
- Work paused, waiting on external dependency
- Examples:
  - Waiting for client feedback
  - Blocked by another task
  - Waiting for access/permissions
- Shows in "Pending" section (if created)

**Changing Task Status:**
- **Method 1:** Drag task card to different section (status auto-updates)
- **Method 2:** Open task → Click status dropdown → Select new status
- **Method 3:** Use keyboard shortcuts (if enabled)

**Status History:**
- System tracks all status changes
- View in task activity timeline
- See who changed status and when
- Calculate time spent in each status (e.g., "3 days in Code Review")

**Pro Tip:** If a task stays "In Progress" for more than 3 days with no activity, check in with the assignee. They may be blocked and need help.

### Subtasks (Breaking Down Large Tasks)

Break complex work into smaller pieces:

**Creating Subtasks:**
1. Open parent task
2. Click **Add Subtask** button
3. Enter subtask title
4. Press Enter to add another
5. Subtasks appear as checklist within parent task

**Example: Parent Task "Launch Website Redesign"**
- [ ] Design homepage mockup
- [ ] Get client approval on design
- [ ] Build homepage in code
- [ ] Write homepage copy
- [ ] Add analytics tracking
- [ ] Test on mobile devices
- [ ] Deploy to production

**Subtask Features:**
- Check off subtasks as completed
- Parent task shows progress (e.g., "4/7 completed")
- Parent task automatically completes when all subtasks checked
- Assignees can be different for each subtask (advanced)

**When to Use Subtasks:**
- Task is too large to complete in one sitting
- Task requires multiple distinct steps
- You want to track progress within a single task
- Work can be done by multiple people

**When to Use Separate Tasks Instead:**
- Work items can be done in parallel (not sequential)
- Each piece deserves its own priority/due date
- Different team members need visibility into different pieces

**Pro Tip:** If a task has more than 10 subtasks, it's probably a mini-project and should be broken into separate tasks instead.

### Task Dependencies (Task A Blocks Task B)

Define relationships between tasks:

**Creating a Dependency:**
1. Open task that is blocked (Task B)
2. Click **Add Dependency** button
3. Search for blocking task (Task A)
4. Select task
5. Choose relationship type:
   - **Blocks** - Task A must complete before Task B can start
   - **Is Blocked By** - Task B cannot start until Task A completes (same as above, reverse perspective)
   - **Related To** - Tasks are connected but not blocking

**Viewing Dependencies:**
- Task detail shows: "Blocked by: Design homepage mockup"
- Blocked tasks show warning icon on card
- Timeline view shows dependency lines connecting tasks

**Dependency Enforcement:**
- System can warn when starting a blocked task (setting)
- Option to strictly enforce (can't start until blocker completes)
- Useful for preventing out-of-order work

**Common Dependency Patterns:**

**Sequential Workflow:**
- Task 1: Design → Task 2: Approval → Task 3: Development → Task 4: Testing → Task 5: Deployment

**Parallel with Merge:**
- Task 1A: Frontend code (parallel with 1B)
- Task 1B: Backend code (parallel with 1A)
- Task 2: Integration testing (blocked by both 1A and 1B)

**Waterfall Stages:**
- Discovery → Design → Development → Testing → Launch
- Each stage blocks the next

**Screenshot Placeholder:** `[Timeline View showing task dependencies with lines connecting dependent tasks, highlighting critical path]`

**Pro Tip:** Use dependencies to identify your project's "critical path"—the sequence of tasks that determines minimum project duration. Focus on critical path tasks to avoid delays.

### Task Comments and Activity

Discuss work and track changes:

**Adding Comments:**
1. Open task
2. Scroll to **Comments** section
3. Type your comment
4. Use formatting:
   - **Bold** - `**bold text**`
   - *Italic* - `*italic text*`
   - `Code` - ` `code` `
   - Links - Paste URL (auto-converts to link)
5. Click **Post Comment**

**@Mentions and Notifications**
- Type `@` and start typing person's name
- Select person from dropdown
- They receive notification about the mention
- Use to pull someone into conversation or request input
- Example: "@John can you review this design?"

**Editing/Deleting Comments:**
- Hover over your comment
- Click **Edit** or **Delete** icon
- Edit: Make changes and click **Save**
- Delete: Confirm deletion

**Activity Timeline:**
- Shows all changes to task
- Auto-logged events:
  - Status changed
  - Assignee changed
  - Due date updated
  - Attachments added
  - Task moved to different section
  - Completed/reopened
- Manual events:
  - Comments
  - Time tracked
- Sorted reverse chronological (newest first)

**Filtering Activity:**
- Click **Show Comments Only** to hide auto-logged events
- Click **Show All Activity** to see everything

**Pro Tip:** Use comments to document decisions and rationale. Future team members (or your future self) will thank you when revisiting the task months later.

### Task Attachments

Attach files to tasks:

**Uploading Attachments:**
1. Open task
2. Click **Attachments** section
3. Click **Upload File** or drag-and-drop
4. Select file(s) from computer
5. Files upload and appear in list

**Supported File Types:**
- Documents: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx)
- Images: JPEG, PNG, GIF, SVG
- Design files: Figma links, Sketch files
- Code: ZIP archives, text files
- Videos: MP4, MOV (up to 100MB)

**File Size Limits:**
- Free plan: 10MB per file, 1GB total storage
- Pro plan: 100MB per file, 100GB total storage
- Enterprise plan: 1GB per file, unlimited storage

**Viewing Attachments:**
- Click filename to download
- Images display inline (preview in task)
- PDFs open in browser viewer

**Linking to External Files:**
- Click **Add Link** button
- Paste URL to Google Drive, Dropbox, Figma, etc.
- Link appears in attachments list
- Click to open in new tab

**Pro Tip:** Instead of attaching multiple versions of a file (design-v1.pdf, design-v2.pdf), use links to live documents (Google Docs, Figma files) that update in place. This prevents version confusion.

### Time Tracking on Tasks

Track how long work takes:

**Manual Time Entry:**
1. Open task
2. Click **Time Tracking** section
3. Enter hours worked (e.g., 2.5h)
4. Add description of work done (optional)
5. Click **Log Time**
6. Time is added to task and your timesheet

**Timer (Real-Time Tracking):**
1. Open task
2. Click **Start Timer** button
3. Timer runs in background (even if you navigate away)
4. When finished, click **Stop Timer**
5. Time is automatically logged to task

**Viewing Time Summary:**
- Task detail shows: "Total Time: 8h" (sum of all time entries)
- Compare to Estimate: "Estimate: 4h / Actual: 8h" (over by 4h)
- Used to improve future estimates

**Time Reports:**
1. Navigate to **Projects → Time Reports**
2. Select project and date range
3. View:
   - Time per task
   - Time per team member
   - Time per project phase
   - Billable vs. non-billable (if configured)

**Pro Tip:** Track time consistently for at least one sprint/project. The data will reveal which types of tasks take longer than expected, helping you improve estimates and identify training needs.

### Bulk Edit Tasks

Update multiple tasks at once:

**Selecting Tasks:**
1. Navigate to List View (easier for bulk operations)
2. Check boxes next to tasks to select
3. Or click **Select All** to select entire list

**Bulk Edit Options:**
1. Click **Bulk Edit** button
2. Choose action:
   - **Change Assignee** - Reassign all selected tasks
   - **Change Due Date** - Set new due date for all
   - **Change Priority** - Update priority for all
   - **Change Section** - Move all to different section
   - **Add Tags** - Apply labels to all
   - **Delete** - Delete all selected tasks (warning shown)
3. Configure action
4. Click **Apply**
5. Confirmation: "Updated 15 tasks"

**Use Cases:**
- Sprint planning: Bulk assign tasks to team members
- Timeline shift: Delay all tasks by 1 week due to dependency
- Reprioritization: Mark all customer-facing tasks as High priority
- Cleanup: Delete old completed tasks to declutter board

**Pro Tip:** Before bulk deleting tasks, use **Export to CSV** to create a backup. Accidental bulk delete is the most common regret users report.

---

## Team Collaboration

### Assigning Tasks to Team Members

Give team members ownership:

**Assigning During Creation:**
- When creating task, select **Assignee** from dropdown
- Assignee receives notification: "You've been assigned: [Task Title]"

**Assigning Existing Task:**
1. Open task
2. Click **Assignee** field
3. Select team member from dropdown
4. Click **Save** (auto-saves in modal)
5. Notification sent to assignee
6. Previous assignee (if any) is notified they were unassigned

**Unassigning a Task:**
- Click **Assignee** field → Select "Unassigned"
- Task returns to unassigned pool
- Useful for tasks that need to be claimed (pull system)

**Self-Assignment:**
- Team members can assign tasks to themselves
- Navigate to board → Click unassigned task → Click **Assign to Me**
- Encourages ownership and autonomy

**Pro Tip:** Use a pull system for knowledge work: Keep some tasks unassigned, let team members pull tasks when they have capacity. This prevents overallocation and respects individual pacing.

### Task Watchers (Notify When Changes Happen)

Keep stakeholders informed:

**Adding Watchers:**
1. Open task
2. Click **Watchers** section
3. Click **+ Add Watcher**
4. Select team member(s) from dropdown (multi-select)
5. Click **Add**
6. Watchers receive notifications for all task updates

**What Watchers Are Notified About:**
- Status changes (In Progress → Done)
- Assignee changes
- Due date changes
- New comments (especially @mentions)
- Attachments added
- Task completed

**Who Should Be a Watcher:**
- Project manager (oversight)
- Client stakeholders (transparency)
- Team leads (awareness)
- Dependent task owners (need to know when blocker clears)
- Anyone who needs visibility without being assignee

**Removing Watchers:**
- Open task → **Watchers** section → Click **X** next to name

**Pro Tip:** As project manager, add yourself as watcher on high-priority or high-risk tasks to stay informed without micromanaging.

### Comments and Discussions

Collaborate on task details:

**Comment Best Practices:**
- **Be specific** - Reference exact details
- **Ask clear questions** - Use @mentions to direct questions
- **Provide context** - Explain why you're commenting
- **Stay on topic** - Keep comments related to task at hand
- **Use formatting** - Bold key points, use bullets for lists

**Example Good Comment:**
> @Sarah - Can you review the homepage design attached above? Specifically, I'm concerned about the mobile navigation menu—does it match the approved wireframes? Need your feedback by Friday so we can start development. Thanks!

**Example Poor Comment:**
> Thoughts?

**Threading Conversations:**
- Click **Reply** on specific comment to create thread
- Keeps related discussion together
- Easier to follow conversation flow

**Resolving Conversations:**
- Click **Resolve** on comment thread when question is answered
- Hides resolved threads (optional setting)
- Keeps active conversations visible

**Pro Tip:** Use comments for decisions and rationale, not just status updates. Document *why* choices were made so future team members understand context.

### @Mentions and Notifications

Pull specific people into conversation:

**How to @Mention:**
1. Type `@` in comment box
2. Start typing person's name
3. Select from dropdown
4. Finish comment and post

**What Happens:**
- Mentioned person receives notification (email + in-app)
- Notification includes task link and comment preview
- Person can click to jump directly to task

**@Mention Use Cases:**
- **Request input** - "@John can you provide the API documentation?"
- **Handoff** - "@Sarah this is ready for your review"
- **Alert** - "@Team the client changed requirements, see comment above"
- **Acknowledge** - "@Lisa great work on this task!"

**Notification Settings:**
Users can configure:
1. Navigate to **Profile → Notification Settings**
2. Choose notification preferences:
   - **Email** - Real-time, hourly digest, daily digest, off
   - **In-App** - Always, only @mentions, off
   - **Slack** - Sync to Slack (if integration enabled)
   - **Mobile Push** - If mobile app installed

**Pro Tip:** Don't abuse @mentions. Only mention people who truly need to see the comment. Over-mentioning creates notification fatigue and people start ignoring notifications.

### Activity Feed

See what's happening across projects:

**Viewing Activity Feed:**
1. Navigate to **Projects → Activity** (main menu)
2. Feed shows recent activity across all projects you have access to
3. Sorted reverse chronological (newest first)

**Activity Types Shown:**
- New tasks created
- Tasks completed
- Tasks assigned to you
- Comments on tasks you're watching
- Tasks moved to Done
- Project milestones reached
- Team members added to projects

**Filtering Activity:**
- **My Activity** - Only tasks assigned to you
- **Watching** - Only tasks/projects you're watching
- **All Activity** - Everything in organization
- **By Project** - Filter to specific project
- **By Person** - See one person's activity

**Activity Notifications:**
- Red badge shows unread activity count
- Click to mark as read

**Pro Tip:** Start your day by reviewing the activity feed for 2-3 minutes. It's the fastest way to understand what happened while you were offline and what needs your attention.

### Comment Notifications

Stay informed without being overwhelmed:

**Default Notification Behavior:**
- **You're assigned a task** → Instant notification (email + in-app)
- **Someone @mentions you** → Instant notification
- **Someone comments on your task** → Instant notification
- **Task you're watching updates** → Batched (hourly digest)
- **Task is completed** → Batched (daily digest)

**Customizing Notifications:**
1. Navigate to **Profile → Settings → Notifications**
2. Configure per notification type:
   - **Off** - Never notify
   - **Real-time** - Immediate email + in-app
   - **Hourly digest** - Summary email every hour
   - **Daily digest** - Summary email each morning
3. Save preferences

**Project-Level Notification Override:**
- Open project settings
- Click **My Notification Preferences**
- Override global settings for this specific project
- Example: Get real-time notifications for "Critical Customer Project" but daily digest for "Internal Process Improvements"

**Muting a Task:**
- Open task you're no longer interested in
- Click **Mute Notifications**
- You'll no longer be notified about this task (even if you're assignee or watcher)
- Useful for tasks that generate lots of activity but don't need your attention

**Pro Tip:** Set notifications to "Hourly digest" for most projects, but "Real-time" for time-sensitive projects. This balances awareness with avoiding constant interruptions.

### Collaboration Best Practices

**For Project Managers:**
- Set clear expectations in project description
- Define "Definition of Done" for tasks
- Hold daily or weekly standup to review board
- Keep board up-to-date (move completed tasks to Done)
- Celebrate wins (comment on completed tasks)
- Address blockers quickly (if task stalls, investigate)

**For Team Members:**
- Update task status regularly (don't let tasks go stale)
- Comment when you start working on a task ("Starting this now")
- Ask questions early (don't struggle in silence)
- Mark tasks complete promptly (don't let Done tasks sit)
- Log time spent (helps with planning)

**For Stakeholders:**
- Add yourself as watcher (stay informed passively)
- Comment with context, not commands ("Here's why this matters")
- Respect team's workflow (don't bypass process)
- Provide feedback promptly when requested

**Pro Tip:** Run a weekly retrospective: What went well? What slowed us down? What can we improve? Use insights to refine your workflow.

---

## AI Features

NextCRM includes AI-powered features to boost productivity:

### AI-Powered Task Suggestions

Let AI help plan your project:

**How It Works:**
1. Open project
2. Click **AI Suggestions** button
3. AI analyzes project description and existing tasks
4. Suggests additional tasks you might have missed

**Example:**
- **Project:** "Website Redesign"
- **Existing Tasks:** "Design homepage", "Build contact form"
- **AI Suggests:**
  - "Audit current website analytics"
  - "Create sitemap for new structure"
  - "Set up staging environment"
  - "Plan SEO migration strategy"
  - "Create 301 redirects for old URLs"

**Accepting Suggestions:**
- Review suggested tasks
- Check boxes next to tasks you want to add
- Click **Add Selected Tasks**
- Tasks are created in "To Do" section

**Improving Suggestions:**
- AI learns from your edits and completions
- More detailed project descriptions = better suggestions
- Works best after you've created initial tasks (AI has context)

**Pro Tip:** Use AI suggestions during project kickoff to ensure you haven't forgotten critical tasks. It's like having an experienced project manager review your plan.

### Smart Notifications

AI prioritizes which notifications you see:

**How It Works:**
- AI learns your work patterns (which tasks you engage with, which you ignore)
- Prioritizes notifications for high-impact tasks
- Deprioritizes noise (low-priority updates on tasks you're not interested in)

**Smart Notification Features:**
- **Urgency Detection** - Flags notifications about overdue or high-priority tasks
- **Relevance Scoring** - Shows you tasks related to your current work
- **Digest Optimization** - Daily digest includes tasks AI thinks you care about most
- **Snooze Suggestions** - AI recommends snoozing low-priority notifications

**Configuring Smart Notifications:**
1. Navigate to **Profile → Settings → AI Features**
2. Toggle **Smart Notifications** on/off
3. Set aggressiveness:
   - **Conservative** - Only filter obvious noise
   - **Balanced** - Moderate filtering (recommended)
   - **Aggressive** - Only show high-relevance notifications
4. AI improves over time as it learns your preferences

**Pro Tip:** Start with "Balanced" setting and adjust based on whether you're missing important notifications or getting too many.

### Task Description Generation

Let AI write task descriptions:

**How It Works:**
1. Create new task with just a title (e.g., "Set up CI/CD pipeline")
2. Click **Generate Description** button
3. AI analyzes task title and project context
4. Generates detailed description with:
   - Step-by-step breakdown
   - Acceptance criteria
   - Relevant considerations
   - Potential pitfalls
5. Review generated description
6. Edit as needed
7. Save task

**Example:**
- **Task Title:** "Set up CI/CD pipeline"
- **AI-Generated Description:**
  > Set up continuous integration and continuous deployment pipeline for the application.
  >
  > **Steps:**
  > 1. Choose CI/CD platform (GitHub Actions, GitLab CI, Jenkins)
  > 2. Create pipeline configuration file
  > 3. Configure automated testing stage
  > 4. Configure build stage
  > 5. Configure deployment stage (staging and production)
  > 6. Set up environment variables and secrets
  > 7. Test pipeline with sample deployment
  >
  > **Acceptance Criteria:**
  > - [ ] Pipeline triggers on every push to main branch
  > - [ ] All tests must pass before deployment
  > - [ ] Automatic deployment to staging environment
  > - [ ] Manual approval required for production deployment
  >
  > **Considerations:**
  > - Ensure proper access controls for production deployments
  > - Set up rollback mechanism in case of failed deployments
  > - Configure notifications for pipeline failures

**When AI Description is Helpful:**
- Onboarding new team members (helps them understand task scope)
- Standard/common tasks (AI has seen similar tasks before)
- Knowledge transfer (captures implicit knowledge)

**When to Write Manually:**
- Highly specific/unique tasks
- When context is critical and non-obvious
- When you want to add personal touch

**Pro Tip:** Use AI to generate first draft, then edit to add project-specific context. This gives you 80% of the work done instantly while maintaining accuracy.

### Intelligent Task Routing

AI suggests who should work on each task:

**How It Works:**
1. Create task (leave assignee blank)
2. AI analyzes:
   - Task title and description
   - Required skills
   - Team member expertise (based on past tasks)
   - Current workload of team members
   - Task priority and due date
3. AI suggests assignee with confidence score

**Suggestion Display:**
- "AI suggests: @Sarah Johnson (85% confidence)"
- Hover for reasoning: "Sarah has completed 12 similar design tasks with average 4.5/5 rating and currently has capacity."

**Accepting/Rejecting Suggestions:**
- Click **Assign to Sarah** to accept
- Click **X** to reject and manually assign
- AI learns from your decisions (improves over time)

**Benefits:**
- Balances workload across team
- Matches tasks to skills
- Reduces project manager's assignment burden
- Surfaces hidden expertise

**Pro Tip:** Trust AI suggestions for routine tasks, but manually assign high-stakes or politically sensitive tasks where relationship matters.

### Predictive Due Dates

AI recommends realistic due dates:

**How It Works:**
1. Create task
2. Leave due date blank
3. AI analyzes:
   - Task complexity (estimated time)
   - Current team workload
   - Historical completion times for similar tasks
   - Dependencies (if task is blocked, suggests date after blocker completes)
4. AI suggests due date with reasoning

**Suggestion Display:**
- "AI suggests: Due December 15 (in 5 days)"
- Reasoning: "Based on 4h estimate and current team capacity, with 1-day buffer"

**Factors AI Considers:**
- **Estimate** - If task is estimated at 4 hours, due date is soon
- **Dependencies** - If blocked by another task, due date is after blocker completes
- **Assignee workload** - If assignee is overloaded, due date is pushed out
- **Project deadline** - Due date fits within project timeline
- **Historical data** - Similar tasks took X days on average

**Pro Tip:** Use AI-suggested due dates as starting point, then adjust based on external factors AI doesn't know about (client deadlines, holidays, team vacations).

---

## Project Analytics

### Burndown Charts (Progress Tracking)

Visualize progress toward completion:

**What is a Burndown Chart?**
- Graph showing work remaining over time
- **Y-axis** = Number of tasks remaining
- **X-axis** = Time (days, weeks, sprints)
- **Ideal line** = Straight line from start to target completion (perfect pace)
- **Actual line** = Real progress (typically jagged)

**Reading the Burndown Chart:**
- **Actual line below ideal** = Ahead of schedule (great!)
- **Actual line on ideal** = On track (perfect!)
- **Actual line above ideal** = Behind schedule (risk!)

**Accessing Burndown Chart:**
1. Open project
2. Click **Analytics** tab
3. View **Burndown Chart** section
4. Select date range (This Sprint, This Month, Custom)

**Example Interpretation:**
```
Tasks Remaining
100 |                    Ideal ----
    |                   /
 75 |                  /    Actual ----
    |                 /    /
 50 |                /   /
    |               /  /
 25 |              / /
    |             //
  0 |____________/__________
    Day 1    Day 7    Day 14
```
**Interpretation:** Actual line is below ideal = team is ahead of schedule!

**Pro Tip:** If actual line flattens (no downward movement), investigate blockers. Flat burndown = no work being completed.

### Velocity Tracking (How Much Team Completes Per Sprint)

Measure team output:

**What is Velocity?**
- Number of tasks (or story points) completed per time period
- Used to predict future capacity
- Improves sprint planning accuracy

**Calculating Velocity:**
- **Velocity** = Tasks completed per sprint
- Example: Sprint 1 (12 tasks), Sprint 2 (15 tasks), Sprint 3 (14 tasks) → Average velocity = 13.7 tasks/sprint

**Viewing Velocity:**
1. Navigate to **Projects → Analytics → Velocity Report**
2. Select project
3. View:
   - Velocity per sprint (bar chart)
   - Average velocity (trend line)
   - Predicted completion date based on velocity

**Using Velocity for Planning:**
- If average velocity = 15 tasks/sprint
- And backlog has 45 tasks remaining
- Then estimated completion = 3 sprints from now

**Factors Affecting Velocity:**
- Team size changes
- Holidays/vacations
- Task complexity (not all tasks are equal)
- Interruptions and unplanned work
- Learning curve (velocity increases over time)

**Pro Tip:** Track velocity over at least 3-4 sprints before using it for predictions. Early sprints have high variability due to learning curve.

### On-Time Completion Rates

Measure reliability:

**What is On-Time Completion Rate?**
- Percentage of tasks completed by their due date
- **Formula:** (Tasks completed on time ÷ Total tasks completed) × 100

**Viewing On-Time Rate:**
1. Navigate to **Projects → Analytics → Completion Report**
2. View metrics:
   - **Overall on-time rate** - Organization-wide
   - **Per project** - Completion rate for specific project
   - **Per person** - Individual reliability
   - **Trend over time** - Is rate improving or declining?

**Benchmarks:**
- **90%+** - Excellent (realistic planning, strong execution)
- **75-90%** - Good (room for improvement)
- **60-75%** - Fair (planning or execution issues)
- **<60%** - Poor (systematic problems)

**Improving On-Time Completion:**
- Set realistic due dates (use AI suggestions + add buffer)
- Identify recurring blockers (address root causes)
- Review overdue tasks weekly (reprioritize or extend deadlines)
- Train team on time estimation
- Build in buffer for unexpected work

**Pro Tip:** If on-time rate is low (<70%), investigate whether problem is **planning** (unrealistic due dates) or **execution** (team is struggling). Fix the right problem.

### Team Productivity Insights

Understand team performance:

**Metrics Available:**
- **Tasks per person** - How many tasks each team member completed
- **Average completion time** - How long tasks take on average
- **Work distribution** - Are tasks evenly distributed or concentrated?
- **Response time** - How quickly team responds to comments/mentions
- **Collaboration score** - How actively team communicates

**Accessing Productivity Insights:**
1. Navigate to **Projects → Analytics → Team Performance**
2. Select project and date range
3. View metrics

**Example Insights:**
- "John completed 18 tasks (team average: 12)" → John is high performer
- "Design tasks take 3.2 days average (2x estimate)" → Design is bottleneck
- "5 tasks assigned to Sarah, 2 to everyone else" → Uneven distribution

**Using Insights for Coaching:**
- Celebrate top performers publicly
- Provide private coaching for strugglers
- Balance workload if distribution is uneven
- Address bottlenecks (tasks that take way longer than estimated)

**Pro Tip:** Use team productivity insights during one-on-ones, not in public team meetings. Public comparisons create unhealthy competition.

### Workload Distribution

Balance work across team:

**Viewing Workload:**
1. Navigate to **Projects → Analytics → Workload**
2. View chart showing tasks per person
3. Color-coded by status:
   - Green = Person has capacity
   - Yellow = Person is at capacity
   - Red = Person is overloaded

**Workload Calculation:**
- **Capacity** = Hours available per week (e.g., 40 hours)
- **Allocated** = Sum of task estimates assigned to person
- **Utilization** = (Allocated ÷ Capacity) × 100%

**Healthy Utilization:**
- **60-80%** - Optimal (allows for unplanned work and buffers)
- **80-100%** - Fully allocated (no room for unexpected work)
- **100%+** - Overallocated (person will miss deadlines or burn out)

**Rebalancing Workload:**
1. Identify overallocated people (red)
2. Identify underallocated people (green)
3. Reassign tasks from overloaded to available team members
4. Use **Bulk Edit** to speed up reassignment

**Pro Tip:** Plan for 70% utilization, not 100%. Knowledge work has interruptions (meetings, email, unplanned urgent tasks). Planning for 100% guarantees missed deadlines.

### Project Health Status

Get overall project assessment:

**Health Score Calculation:**
AI analyzes multiple factors:
- **On-time rate** - Are tasks completing on schedule?
- **Velocity trend** - Is team speeding up or slowing down?
- **Blockers** - How many tasks are blocked?
- **Overdue tasks** - How many tasks are past due date?
- **Workload balance** - Is work evenly distributed?
- **Activity level** - Is team actively working on project?

**Health Status:**
- **Healthy (Green)** - Project is on track, no major concerns
- **At Risk (Yellow)** - Some issues detected, needs attention
- **Critical (Red)** - Serious problems, immediate action required

**Viewing Project Health:**
1. Navigate to **Projects** list
2. Each project shows health indicator (colored dot)
3. Click project → **Analytics** tab → **Health Report**
4. View detailed breakdown of health factors

**Example Health Report:**
- **Overall Health:** At Risk (Yellow)
- **Factors:**
  - ✅ Velocity stable (14 tasks/sprint)
  - ⚠️ On-time rate declining (was 85%, now 70%)
  - ❌ 8 tasks overdue (critical)
  - ⚠️ 3 team members overallocated
  - ✅ No blocked tasks

**Recommended Actions:**
- Review overdue tasks (extend deadlines or escalate blockers)
- Rebalance workload (reassign tasks from overallocated members)

**Pro Tip:** Review project health weekly in team standup. Address yellow/red status before it becomes critical. Early intervention prevents project failure.

### Time Tracking Reports

Understand where time is spent:

**Time Reports Available:**
1. **Time by Task** - Which tasks took the longest?
2. **Time by Person** - How much time did each person work?
3. **Time by Project** - Total time spent on project
4. **Estimate vs. Actual** - Were estimates accurate?
5. **Billable vs. Non-Billable** - (If configured) Track client-billable work

**Accessing Time Reports:**
1. Navigate to **Projects → Analytics → Time Reports**
2. Select project and date range
3. View report

**Example Time by Task Report:**
| Task | Estimate | Actual | Variance |
|------|----------|--------|----------|
| Design homepage | 4h | 8h | +100% |
| Build API | 8h | 6h | -25% |
| Write tests | 2h | 5h | +150% |

**Insights:**
- Design tasks taking 2x estimate → Improve design estimates or allocate more time
- API development faster than expected → Team is getting more efficient
- Testing taking longer → May need testing training or better tools

**Pro Tip:** Review estimate vs. actual reports monthly. Use insights to improve future estimates. Over time, your estimates become accurate, reducing planning stress.

---

## Common Workflows

### Running a Sprint (Weekly Project Cycle)

Use NextCRM for agile sprint planning:

**Sprint Setup (Monday):**
1. Create project: "Sprint 45 - Nov 18-24"
2. Set start date (Monday) and end date (Friday)
3. Add team members
4. Create sections: Backlog → To Do → In Progress → Review → Done

**Sprint Planning (Monday 9-10am):**
1. Review backlog (prioritized list of tasks)
2. Estimate each task (hours or story points)
3. Calculate team capacity (team size × hours per person × days in sprint)
4. Move tasks from Backlog to To Do until capacity is filled
5. Assign tasks to team members (or let team self-assign)

**Daily Standup (Every morning, 15 min):**
1. Open project board
2. Each team member answers:
   - What did you complete yesterday? (move task to Done)
   - What are you working on today? (move task to In Progress)
   - Any blockers? (mark task as blocked, discuss solution)
3. Project manager notes blockers and follows up

**Sprint Review (Friday 2-3pm):**
1. Review completed tasks (celebrate wins!)
2. Demo completed features to stakeholders
3. Mark sprint as complete
4. Move incomplete tasks to next sprint's backlog

**Sprint Retrospective (Friday 3-4pm):**
1. Discuss: What went well?
2. Discuss: What slowed us down?
3. Discuss: What can we improve?
4. Create action items for next sprint
5. Review velocity (compare to previous sprints)

**Pro Tip:** Keep sprints short (1-2 weeks max). Shorter sprints = faster feedback loops = better planning.

### Managing Client Projects

Deliver client work on time:

**Project Setup:**
1. Create project: "[Client Name] - [Deliverable]"
2. Link to CRM Account (client company)
3. Link to Opportunity (track delivery against sale)
4. Add team members (internal staff)
5. Add watchers (client stakeholders for transparency)

**Client Communication:**
- Share project board with client (set visibility to "Shared")
- Client can view progress but not edit tasks
- Add client stakeholder as watcher (they receive updates)
- Use comments for client communication (@ mention client contact)

**Milestone Tracking:**
1. Create sections for each milestone:
   - Discovery → Design → Development → Client Review → Launch
2. Set due dates aligned to contract timeline
3. Mark milestone complete when all tasks in section are done
4. Send milestone completion notification to client

**Status Reporting:**
1. Navigate to project Analytics
2. Export progress report (PDF)
3. Include:
   - Completed tasks
   - In-progress tasks
   - Upcoming milestones
   - On-time completion rate
   - Any blockers or risks
4. Send to client weekly or bi-weekly

**Pro Tip:** For client projects, err on the side of over-communication. Clients hate surprises. Weekly updates (even if it's "still working on design") build trust.

### Event Coordination

Plan complex events:

**Event Project Setup:**
1. Create project: "Annual Sales Kickoff 2025"
2. Set start date = planning begins
3. Set end date = event date
4. Create sections:
   - Planning → Venue → Marketing → Logistics → Day-Of → Wrap-Up

**Phase 1: Planning**
- Tasks: Define goals, set budget, create timeline, identify speakers
- Assignee: Event lead

**Phase 2: Venue**
- Tasks: Research venues, negotiate contract, book venue, arrange AV
- Assignee: Logistics coordinator

**Phase 3: Marketing**
- Tasks: Design invitations, build event website, email campaigns, social media
- Assignee: Marketing team

**Phase 4: Logistics**
- Tasks: Book catering, arrange transportation, print materials, prep swag bags
- Assignee: Logistics coordinator

**Phase 5: Day-Of**
- Tasks: Set up venue, registration check-in, manage sessions, troubleshoot
- Assignee: Full team

**Phase 6: Wrap-Up**
- Tasks: Send thank-you emails, collect feedback surveys, analyze results, post-event report
- Assignee: Event lead

**Pro Tips for Event Projects:**
- Use subtasks for complex tasks (e.g., "Book Venue" has subtasks for research, negotiate, sign contract)
- Set due dates with buffers (things always take longer for events)
- Create dependencies (can't send invitations until venue is booked)
- Use file attachments for contracts, invoices, speaker bios
- Daily standup during final week before event

### Marketing Campaign Planning

Coordinate multi-channel campaigns:

**Campaign Project Setup:**
1. Create project: "Holiday 2024 Email Campaign"
2. Set timeline: Planning start → Campaign launch → Campaign end → Analysis
3. Create sections: Strategy → Content → Design → Development → QA → Scheduled → Sent → Analysis

**Strategy Phase:**
- Define goals (revenue target, email opens, conversions)
- Identify audience segments
- Create messaging themes
- Set budget

**Content Phase:**
- Write email copy
- Create subject lines (A/B test options)
- Write landing page copy
- Draft social media posts

**Design Phase:**
- Design email template
- Create graphics/images
- Design landing page
- Get brand approval

**Development Phase:**
- Build email in email tool
- Build landing page
- Set up tracking (UTM parameters, conversion pixels)
- Integrate with CRM

**QA Phase:**
- Send test emails
- Test links
- Test on multiple email clients (Gmail, Outlook, Apple Mail)
- Test on mobile
- Get final approval

**Launch:**
- Schedule email send
- Activate landing page
- Publish social media posts
- Monitor sends for deliverability issues

**Analysis Phase:**
- Review metrics (open rate, click rate, conversions, revenue)
- Compare to benchmarks
- Document learnings
- Plan next campaign improvements

**Pro Tip:** Create a campaign template with these phases pre-built. Reuse it for every campaign to ensure you don't skip critical steps.

### Software Development Project Example

Manage feature development:

**Feature Project Setup:**
1. Create project: "User Authentication Feature"
2. Link to product roadmap item or user story
3. Create sections: Design → Development → Code Review → QA → Staging → Production

**Design Phase:**
- Tasks: Write technical spec, design database schema, create API contracts, review security
- Assignee: Tech lead or architect

**Development Phase:**
- Tasks: Build backend API, build frontend UI, write unit tests, integrate components
- Assignee: Developers

**Code Review Phase:**
- Tasks: PR #1 review, PR #2 review, address feedback, final approval
- Assignee: Senior developers

**QA Phase:**
- Tasks: Test happy path, test error cases, test edge cases, regression testing
- Assignee: QA engineer

**Staging Deployment:**
- Tasks: Deploy to staging, smoke test, stakeholder demo, get approval
- Assignee: DevOps + Product Manager

**Production Deployment:**
- Tasks: Deploy to production, monitor error rates, monitor performance, announce to users
- Assignee: DevOps + Product Manager

**Post-Launch:**
- Tasks: Monitor metrics, fix bugs, gather user feedback, iterate

**Pro Tip:** Use dependencies to enforce workflow (can't deploy to staging until code review is complete). This prevents half-baked work from reaching customers.

---

## FAQ - Projects Module

**Q: What's the difference between a project and a board?**
- In NextCRM, **project** and **board** are synonyms. Every project has one board.

**Q: Can I have multiple boards per project?**
- No, each project has one Kanban board. If you need multiple boards, create separate projects.

**Q: Can a task belong to multiple projects?**
- No, each task belongs to exactly one project. If work spans projects, create separate tasks and link them in comments.

**Q: How do I move a task to a different project?**
- Open task → Edit → Change **Project** field → Save. Task moves to new project.

**Q: Can I convert an email to a task?**
- Yes (if email integration enabled). Open email → Click **Create Task** → Task is created with email content as description.

**Q: How do I print a project timeline?**
- Open project → Switch to **Timeline View** → Click **Export** → Choose PDF → Timeline exports as Gantt chart.

**Q: Can I track time without a timer?**
- Yes. Open task → Time Tracking → Manually enter hours → Save.

**Q: What happens to tasks when a project is deleted?**
- All tasks in the project are permanently deleted. Export project to CSV before deleting if you want to preserve data.

**Q: Can external stakeholders (clients) access projects?**
- Yes. Set project visibility to "Public" and share link with client. They can view but not edit.

**Q: How do I archive old completed projects?**
- Open project → Settings → Archive. Project is hidden from active list but preserved.

---

## Next Steps

**You've mastered NextCRM Projects!** Here's what to explore next:

1. **[CRM Guide](./CRM-GUIDE.md)** - Link projects to accounts and opportunities
2. **[Documents Guide](./DOCUMENTS-GUIDE.md)** - Attach files to tasks and projects
3. **[Admin Guide](./ADMIN-GUIDE.md)** - Configure project settings and permissions
4. **[Email Guide](./EMAIL-GUIDE.md)** - Convert emails to tasks automatically

**Need Help?**
- [FAQ](./FAQ.md) - Frequently asked questions
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions
- Support: support@nextcrm.io

---

**Last Updated:** 2024-11-17
**Guide Version:** 1.0
**Feedback:** docs@nextcrm.io
