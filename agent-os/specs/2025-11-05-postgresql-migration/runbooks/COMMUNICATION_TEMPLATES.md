# Communication Templates

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Purpose:** Pre-written communication templates for all migration phases

## Overview

This document provides ready-to-use communication templates for notifying stakeholders and users throughout the PostgreSQL migration process. Customize templates with specific dates, times, and details before sending.

---

## Template Index

**Pre-Migration:**
1. Initial Announcement (T-14 days)
2. Reminder Notice (T-7 days)
3. Final Reminder (T-1 day)
4. Pre-Migration FAQ

**During Migration:**
5. Maintenance Start Notice
6. Progress Update (During Migration)
7. Delay Notification (If Needed)

**Post-Migration:**
8. Migration Complete - Success
9. Migration Complete - With Known Issues
10. Rollback Notification
11. One Week Follow-up

**Internal:**
12. Team Briefing
13. Incident Alert
14. Post-Mortem Invitation

---

## 1. Initial Announcement (T-14 Days)

**To:** All Users
**Subject:** Important: Scheduled System Maintenance - November 6-7, 2025
**Channel:** Email, In-App Notification

```markdown
Subject: Important: Scheduled System Maintenance - November 6-7, 2025

Dear NextCRM Users,

We are writing to inform you of important scheduled maintenance that will affect NextCRM service availability.

**What:** Database infrastructure upgrade
**When:** Saturday, November 6, 8:00 AM - Sunday, November 7, 10:00 AM (EST)
**Expected Duration:** Up to 26 hours
**Impact:** NextCRM will be unavailable during this period

**What We're Doing:**
We are upgrading our database infrastructure from MongoDB to PostgreSQL. This upgrade will:
- Improve application performance by 30%
- Enhance system reliability and data integrity
- Enable new features we're planning to release in Q2 2025
- Provide a more robust foundation for future growth

**What You Need to Do:**
- **Save Your Work:** Please complete any critical work and save all data before 8:00 AM on Saturday, November 6
- **Plan Accordingly:** Schedule any critical CRM activities for before or after the maintenance window
- **No Data Loss:** All your existing data will be preserved and migrated automatically

**Why This Timing:**
We chose a weekend window to minimize impact on your business operations. We understand this is a significant maintenance window, but this upgrade is essential for the long-term health and performance of NextCRM.

**Communication During Maintenance:**
- We will provide progress updates every 4 hours during the migration
- Updates will be posted to our status page: https://status.nextcrm.com
- For urgent issues, contact support@nextcrm.com

**Questions?**
If you have any questions or concerns about this maintenance, please reach out to our support team at support@nextcrm.com or reply to this email.

We appreciate your patience and understanding as we make these important improvements to NextCRM.

Thank you,
The NextCRM Team

---
**Frequently Asked Questions:**

**Q: Will my data be safe?**
A: Yes, absolutely. We are taking comprehensive backups before the migration, and the migration process has been thoroughly tested in our staging environment.

**Q: Will anything look different after the upgrade?**
A: No, the user interface and your workflows will remain exactly the same. This is a backend infrastructure upgrade.

**Q: What if I need to access NextCRM during the maintenance window?**
A: Unfortunately, the system will be completely unavailable during the maintenance period. Please plan your work accordingly.

**Q: What happens if something goes wrong?**
A: We have a tested rollback procedure that can restore service within 30 minutes if any critical issues arise.

**Q: Can I opt out of this maintenance?**
A: No, this is a system-wide upgrade that affects all users. The upgrade is necessary for the continued health and improvement of NextCRM.
```

---

## 2. Reminder Notice (T-7 Days)

**To:** All Users
**Subject:** Reminder: NextCRM Maintenance This Weekend (Nov 6-7)
**Channel:** Email

```markdown
Subject: Reminder: NextCRM Maintenance This Weekend (Nov 6-7)

Dear NextCRM Users,

This is a reminder that our scheduled database upgrade will take place this weekend.

**Maintenance Window:**
- Start: Saturday, November 6 at 8:00 AM EST
- Expected End: Sunday, November 7 at 10:00 AM EST
- Duration: Up to 26 hours

**What You Should Do NOW:**
1. ✅ Complete any critical work before Saturday morning
2. ✅ Save and sync all your data
3. ✅ Download any reports you'll need over the weekend
4. ✅ Inform your team members about the downtime
5. ✅ Plan alternative workflows if needed

**During the Maintenance:**
- NextCRM will be completely unavailable
- You will see a maintenance page when accessing the application
- No data entry or viewing will be possible
- Mobile apps will also be unavailable

**After the Maintenance:**
- You'll receive an email notification when the system is back online
- All your data will be intact and accessible
- The application will look and work exactly as before
- You may notice improved performance

**Status Updates:**
Track our progress at: https://status.nextcrm.com

**Questions or Concerns?**
Contact us at support@nextcrm.com

Thank you for your cooperation.

Best regards,
The NextCRM Team

---
P.S. If you haven't already, please save any unsaved work before Saturday morning!
```

---

## 3. Final Reminder (T-1 Day)

**To:** All Users
**Subject:** FINAL REMINDER: NextCRM Maintenance Starts Tomorrow (Nov 6, 8AM)
**Channel:** Email, In-App Banner, SMS (if available)

```markdown
Subject: ⚠️ FINAL REMINDER: NextCRM Maintenance Starts Tomorrow Morning

Dear NextCRM Users,

This is your FINAL reminder that NextCRM will be offline for maintenance starting TOMORROW MORNING.

🛑 **System Goes Offline:**
Tomorrow (Saturday, November 6) at 8:00 AM EST

🔧 **Expected Back Online:**
Sunday, November 7 at 10:00 AM EST

⏰ **Last Chance to Save Work:**
Please complete all critical work and save your data by TONIGHT (Friday).

**Tomorrow Morning:**
When you attempt to access NextCRM, you will see a maintenance page. This is expected and normal.

**What to Expect:**
- The system will be completely unavailable for up to 26 hours
- All data is being safely migrated to our new database infrastructure
- No action is required from you during the maintenance
- Your data, settings, and preferences will be preserved

**Stay Informed:**
- Status updates: https://status.nextcrm.com
- Questions: support@nextcrm.com

**After Maintenance:**
You'll receive an email confirmation when NextCRM is back online and ready to use.

Thank you for your patience and understanding.

The NextCRM Team

---
**Have a question right now?**
Our support team is available until 10 PM EST tonight: support@nextcrm.com
```

---

## 4. Pre-Migration FAQ

**Where to Post:** Knowledge Base, Help Center, Email Attachment

```markdown
# NextCRM Database Migration - Frequently Asked Questions

## General Questions

**Q: What exactly are you upgrading?**
A: We are migrating our database infrastructure from MongoDB to PostgreSQL. This is a backend change that improves performance, reliability, and enables new features.

**Q: How long will the maintenance take?**
A: We expect the maintenance to take approximately 26 hours (Saturday 8 AM - Sunday 10 AM EST). We've built in buffer time; we may finish earlier.

**Q: Why does it take so long?**
A: We are migrating millions of records carefully and methodically. We are also performing extensive validation to ensure zero data loss. Speed is secondary to data integrity.

**Q: Can you do this in smaller chunks to reduce downtime?**
A: Unfortunately, no. A database migration of this type must be done as a complete, atomic operation. Splitting it would actually increase risk and overall downtime.

## Data Safety Questions

**Q: Will my data be safe?**
A: Yes. We are taking multiple backups before the migration. The migration process has been tested extensively in our staging environment with a complete copy of production data.

**Q: What if something goes wrong during the migration?**
A: We have a tested rollback procedure that can restore the previous system within 30 minutes. Your data is backed up and safe.

**Q: Will all my data be migrated?**
A: Yes, 100% of your data will be migrated. This includes:
- All accounts, contacts, leads, opportunities, and contracts
- All tasks and project data
- All documents and invoices
- All users and settings
- Complete history and audit trails

**Q: Could any data be lost?**
A: We have designed the migration to achieve zero data loss. Multiple validation checks ensure data integrity.

## User Experience Questions

**Q: Will anything look different after the upgrade?**
A: No. The user interface, workflows, and features will remain identical. This is purely a backend infrastructure change.

**Q: Will my login credentials change?**
A: No, your username and password will remain the same.

**Q: Will my bookmarks or saved filters be affected?**
A: No, all user preferences, bookmarks, saved filters, and customizations will be preserved.

**Q: Will integrations (API, webhooks) continue to work?**
A: Yes, all integrations will continue to work without any changes needed.

## Business Impact Questions

**Q: What should I do to prepare?**
A:
1. Complete any critical work before Saturday morning
2. Save all your data (though it saves automatically)
3. Download any reports you'll need over the weekend
4. Inform your team about the downtime

**Q: What if I have an urgent sales deal this weekend?**
A: Please complete any urgent CRM work before the maintenance window. If you have a critical business need, contact our support team to discuss alternatives.

**Q: Can mobile apps be used during maintenance?**
A: No, mobile apps will also be unavailable during the maintenance window.

**Q: What if I try to access the system during maintenance?**
A: You will see a maintenance page explaining the situation. The system will not be accessible.

## Technical Questions

**Q: Why are you switching from MongoDB to PostgreSQL?**
A: PostgreSQL provides:
- Better performance for complex queries (30% faster)
- Stronger data integrity guarantees
- More robust relational data modeling
- Advanced features needed for upcoming AI capabilities
- Broader ecosystem and tooling support

**Q: Will the system be faster after the migration?**
A: Yes, you should notice improved performance, particularly:
- Faster page loads (20-30% faster)
- Quicker search results
- More responsive reports and dashboards

**Q: What new features will this enable?**
A: The migration enables several upcoming features planned for Q2 2025:
- AI-powered insights and recommendations
- Advanced analytics and reporting
- Enhanced search capabilities
- Improved data relationships and workflows

## Communication Questions

**Q: How will I know when the maintenance is complete?**
A: You will receive an email notification when NextCRM is back online. You can also check our status page at https://status.nextcrm.com.

**Q: Will you provide updates during the maintenance?**
A: Yes, we will post progress updates every 4 hours on our status page.

**Q: What if the maintenance takes longer than expected?**
A: We will communicate any delays via email and status page updates. We have built buffer time into our estimate.

**Q: Who do I contact if I have questions?**
A: Email support@nextcrm.com or reply to any of our maintenance notification emails.

## After Maintenance

**Q: What should I do when the system is back online?**
A: Simply log in as normal. Everything should work exactly as it did before. If you notice any issues, please report them to support@nextcrm.com immediately.

**Q: What if I find a problem after the migration?**
A: Please report any issues to support@nextcrm.com immediately. We will have our full team available for 48 hours after the migration to address any concerns.

**Q: Will there be any follow-up maintenance?**
A: No, this is a one-time migration. Normal operations will resume after this maintenance.

---

**Still have questions?**
Contact us at support@nextcrm.com - we're here to help!
```

---

## 5. Maintenance Start Notice

**To:** All Users
**Subject:** NextCRM Maintenance Now In Progress
**Channel:** Email, Status Page, Login Screen Message

```markdown
Subject: NextCRM Maintenance Now In Progress

Dear NextCRM Users,

Our scheduled database upgrade has begun.

**Status:** Maintenance In Progress
**Started:** Saturday, November 6 at 8:00 AM EST
**Expected Completion:** Sunday, November 7 at 10:00 AM EST

**Current Status:**
NextCRM is currently offline for database infrastructure upgrade. The system is not accessible during this time.

**What's Happening:**
Our team is carefully migrating your data to our new PostgreSQL database infrastructure. This process includes:
- Complete data migration
- Comprehensive validation
- Performance optimization
- Final testing before go-live

**Progress Updates:**
We will post updates every 4 hours at: https://status.nextcrm.com

**What You'll See:**
If you attempt to access NextCRM, you will see a maintenance page. This is expected and normal.

**When We're Back:**
You will receive an email notification as soon as NextCRM is back online and ready to use.

**Questions?**
Email support@nextcrm.com (response times may be delayed during maintenance)

Thank you for your patience as we complete this important upgrade.

The NextCRM Team
```

---

## 6. Progress Update (During Migration)

**To:** All Users, Stakeholders
**Subject:** NextCRM Migration Progress Update
**Channel:** Email, Status Page
**Frequency:** Every 4 hours

```markdown
Subject: NextCRM Migration Progress Update - [TIME]

Hello,

Quick update on our database migration progress:

**Status:** In Progress - On Schedule ✓
**Time:** [CURRENT_TIME]
**Completion:** [XX]% Complete

**Current Phase:**
[e.g., "Currently migrating opportunity records (Phase 5 of 10)"]

**Progress:**
- Total records migrated: [NUMBER] ([XX]% complete)
- Migration speed: [XX] records/second
- Estimated completion: Sunday, November 7 at [TIME] EST

**All Systems:**
✓ Data migration proceeding smoothly
✓ No significant errors detected
✓ Validation checks passing
✓ Team monitoring closely

**Next Steps:**
- Continue with remaining data migration phases
- Run comprehensive validation
- Perform final testing
- Deploy application and go live

**Next Update:**
Next progress update in 4 hours at [TIME]

**Live Status:**
Track real-time progress at: https://status.nextcrm.com

Thank you for your continued patience.

The NextCRM Team
```

---

## 7. Delay Notification (If Needed)

**To:** All Users, Stakeholders
**Subject:** NextCRM Migration Update - Extended Maintenance Window
**Channel:** Email, Status Page

```markdown
Subject: NextCRM Migration Update - Extended Maintenance Window

Dear NextCRM Users,

We want to update you on our database migration progress.

**Status:** In Progress - Extended Timeline
**Original Completion:** Sunday, November 7 at 10:00 AM EST
**Revised Completion:** Sunday, November 7 at [NEW_TIME] EST

**What's Happening:**
[Choose appropriate reason:]

Option A (Taking longer than expected):
"The migration is proceeding smoothly, but is taking longer than our estimates due to the large volume of data. We want to ensure every record is migrated accurately, which takes additional time."

Option B (Technical issue encountered):
"We encountered [brief description of issue], which we have now resolved. Out of an abundance of caution, we are re-running validation checks to ensure data integrity."

Option C (Optimization):
"We identified an opportunity to add additional performance optimizations during the migration. This will provide better long-term performance but extends our timeline."

**Current Status:**
- Data migration: [XX]% complete
- All data is safe and secure
- No data loss
- Quality over speed - we're being thorough

**New Timeline:**
We now expect to complete the migration and bring NextCRM back online by [NEW_TIME] on Sunday, November 7.

**Why the Delay?**
Your data integrity is our top priority. We would rather take additional time to ensure the migration is perfect than rush and risk issues.

**What This Means for You:**
- NextCRM will remain offline for an additional [X] hours
- All your data remains safe
- The migration will be completed properly
- No action needed from you

**Updates:**
We will continue to post progress updates every 4 hours at: https://status.nextcrm.com

We sincerely apologize for the extended downtime and appreciate your patience and understanding.

The NextCRM Team

---
Questions or concerns? Email support@nextcrm.com
```

---

## 8. Migration Complete - Success

**To:** All Users
**Subject:** ✅ NextCRM Is Back Online - Migration Successful
**Channel:** Email, Status Page, In-App Notification

```markdown
Subject: ✅ NextCRM Is Back Online - Migration Successful

Dear NextCRM Users,

Great news! Our database migration has been completed successfully, and NextCRM is now back online.

**Status:** ✅ ONLINE AND OPERATIONAL

**What Happened:**
We successfully migrated all your data to our new PostgreSQL database infrastructure. The migration included:
- [X,XXX,XXX] records migrated
- 100% data integrity verified
- Comprehensive validation passed
- Performance testing completed
- All systems operational

**What You'll Notice:**
- Faster page loads (20-30% improvement)
- Quicker search results
- More responsive reports
- Improved overall performance
- Same familiar interface and workflows

**What You Should Do:**
1. **Log in** to NextCRM as normal
2. **Verify** your recent data looks correct
3. **Report** any issues immediately to support@nextcrm.com

**What Stayed the Same:**
- All your data (zero data loss)
- Your login credentials
- The user interface
- Your workflows and processes
- All features and functionality

**Known Items:**
[If applicable:]
- [Any minor known issues and their status]
OR
- No known issues - system fully operational

**Thank You:**
Thank you for your patience during this maintenance. This upgrade provides a stronger foundation for NextCRM's future growth and the new features we have planned.

**Need Help?**
If you notice anything unusual or have any questions:
- Email: support@nextcrm.com
- Phone: [Support phone number]
- Live Chat: Available in the application

Welcome back!

The NextCRM Team

---
**P.S.** We'll be monitoring the system closely for the next 48 hours. Don't hesitate to reach out if anything seems off.
```

---

## 9. Migration Complete - With Known Issues

**To:** All Users
**Subject:** NextCRM Is Back Online - With Notes
**Channel:** Email

```markdown
Subject: NextCRM Is Back Online - Please Read

Dear NextCRM Users,

Our database migration has been completed, and NextCRM is now back online. However, we want to inform you of a couple of items to be aware of.

**Status:** ✅ ONLINE - With Known Issues

**What Was Completed:**
The database migration was successful:
- All data migrated successfully
- Data integrity verified
- Core functionality operational

**Known Issues:**
We identified the following items that we're actively addressing:

1. **[Issue 1 Description]**
   - **Impact:** [Who is affected and how]
   - **Status:** [Fix in progress / Scheduled for [time]]
   - **Workaround:** [If available]

2. **[Issue 2 Description]**
   - **Impact:** [Who is affected and how]
   - **Status:** [Fix in progress / Scheduled for [time]]
   - **Workaround:** [If available]

**What's Working:**
- [List of fully functional features]
- [Include all core functionality]

**Our Plan:**
- We are actively working on resolving the known issues
- Expected resolution: [Timeframe]
- We will send updates every [frequency]
- Our full team is dedicated to resolving these items

**What You Should Do:**
1. Log in and use the system as normal
2. Be aware of the known issues listed above
3. Use workarounds where provided
4. Report any NEW issues to support@nextcrm.com
5. We'll notify you as soon as issues are resolved

**Your Data:**
- All your data is safe and intact
- No data loss occurred
- Data integrity is 100%

**Need Immediate Help?**
Priority support available:
- Email: support@nextcrm.com
- Phone: [Support phone number]
- Live Chat: Available in application

**Updates:**
We will send progress updates on issue resolution every [X] hours.

We apologize for any inconvenience these issues may cause. Thank you for your patience as we work to resolve them.

The NextCRM Team

---
**Status Page:** https://status.nextcrm.com
```

---

## 10. Rollback Notification

**To:** All Users, Stakeholders
**Subject:** IMPORTANT: NextCRM Service Restored - Migration Postponed
**Channel:** Email, Status Page, SMS

```markdown
Subject: IMPORTANT: NextCRM Service Restored

Dear NextCRM Users,

We want to update you on our maintenance status.

**Status:** ✅ SYSTEM RESTORED AND OPERATIONAL

**What Happened:**
During our database migration, we encountered technical issues that required us to restore NextCRM from our backup. The system is now fully operational on our original database infrastructure.

**Current Status:**
- NextCRM is online and fully functional
- All data from before the maintenance window is safe and accessible
- Your login credentials and settings are unchanged
- The system is operating normally

**Data Impact:**
Any data created or modified during the brief migration period ([TIME] to [TIME] on [DATE]) was not preserved. This affects approximately [X] records.

**If You Entered Data During the Maintenance:**
If you created or updated records during the migration window, please re-enter that information. We apologize for this inconvenience.

**Next Steps:**
- Use NextCRM normally - everything is back to how it was
- Re-enter any data created during the maintenance window
- Contact support if you notice anything unusual

**About the Migration:**
We made the decision to restore from backup when [brief reason]. Your data integrity is our top priority, and this was the safest course of action.

**Future Plans:**
We are analyzing what happened and will communicate our plans for the database upgrade at a later date.

**We Apologize:**
We sincerely apologize for:
- The extended downtime
- Any data you need to re-enter
- The inconvenience this has caused

Your patience and understanding mean everything to us.

**Need Help?**
Our support team is standing by:
- Email: support@nextcrm.com
- Phone: [Support phone number]
- Live Chat: Available 24/7

Thank you for your understanding.

The NextCRM Team

---
**Questions or concerns?**
We're here to help: support@nextcrm.com
```

---

## 11. One Week Follow-up

**To:** All Users
**Subject:** NextCRM Post-Migration Update - One Week Later
**Channel:** Email

```markdown
Subject: NextCRM Update - One Week Since Migration

Dear NextCRM Users,

It's been one week since we completed our database migration to PostgreSQL. We wanted to check in and share some updates.

**Performance Improvements:**
Since the migration, we're seeing great results:
- Page load times: 32% faster on average
- Search queries: 45% faster
- Report generation: 28% faster
- System uptime: 99.98%

**Your Feedback:**
Thank you to everyone who provided feedback this week. We've heard from many of you about:
- Improved application speed ✓
- Better search responsiveness ✓
- Smoother report generation ✓

**Issues Resolved:**
[If applicable:]
We resolved [X] minor issues reported during the first week:
- [List any issues that were reported and fixed]

**What's Next:**
Now that we're on PostgreSQL, we're excited to begin developing new features that weren't possible before:
- AI-powered insights (Coming Q2 2025)
- Enhanced analytics
- Advanced search capabilities
- [Other planned features]

**Still Noticing Something?**
If you're still experiencing any issues or have questions:
- Email: support@nextcrm.com
- Knowledge Base: https://help.nextcrm.com

**Thank You:**
Thank you again for your patience during the migration. Your understanding made this important upgrade possible.

Here's to faster, more reliable CRM operations!

The NextCRM Team

---
**Fun Fact:** The migration processed [X] million records, which if printed would be [X] feet of paper!
```

---

## 12. Team Briefing (Internal)

**To:** All Team Members
**Subject:** [TEAM ONLY] PostgreSQL Migration - Final Briefing
**Channel:** Email, Slack

```markdown
Subject: [TEAM] PostgreSQL Migration - Final Briefing Before Go-Live

Team,

This is our final briefing before the production migration this weekend. Please review carefully.

**Timeline:**
- Friday 5 PM: Final staging test
- Friday 7 PM: Team dinner (optional)
- Friday 11 PM: Final go/no-go decision
- Saturday 8 AM: Migration begins
- Sunday 10 AM: Target completion

**Team Assignments:**

**Migration Lead:** [Name]
- Overall coordination
- Decision authority
- Stakeholder communication

**Database Team:**
- Primary: [Name] - On-site, main migration execution
- Backup: [Name] - Remote, monitoring & support
- Responsibility: Migration script, validation, rollback (if needed)

**DevOps Team:**
- Primary: [Name] - On-site, infrastructure
- Backup: [Name] - Remote, monitoring
- Responsibility: Servers, monitoring, deployment

**Application Team:**
- Primary: [Name] - On-site, application deployment
- Backup: [Name] - Remote, testing & support
- Responsibility: App deployment, smoke testing, bug fixes

**Support Team:**
- Lead: [Name] - Managing user communications
- Responsibility: User notifications, status page, FAQ

**Shifts:**
- Shift 1 (8 AM - 4 PM Saturday): [Names]
- Shift 2 (4 PM Saturday - 12 AM Sunday): [Names]
- Shift 3 (12 AM - 8 AM Sunday): [Names]
- Shift 4 (8 AM - 4 PM Sunday): [Names]

**Communication:**
- Primary: Slack #migration-war-room (check every 15 min)
- Emergency: Conference bridge [number]
- Escalation: [CTO phone]

**Runbooks:**
All runbooks are in: /agent-os/specs/2025-11-05-postgresql-migration/runbooks/
- PHASE6_PRODUCTION_RUNBOOK.md (PRIMARY)
- ROLLBACK_PROCEDURES.md (EMERGENCY)
- MONITORING_GUIDE.md (REFERENCE)

**Pre-Migration Checklist:**
Everyone please confirm by Friday 6 PM:
- [ ] Reviewed assigned runbook sections
- [ ] Tested access to production systems
- [ ] Laptop charged + backup power
- [ ] VPN/remote access tested
- [ ] Mobile phone charged
- [ ] Emergency contacts saved
- [ ] Know your shift assignment
- [ ] Know rollback procedure

**Go/No-Go Criteria:**
We will NOT proceed if:
- Production backup fails
- Staging test this afternoon fails
- Any team member has concerns
- Infrastructure issues
- Any critical production incidents

**Critical Numbers:**
- Migration Lead: [Phone]
- CTO: [Phone]
- Database Admin: [Phone]
- DevOps Lead: [Phone]

**Final Thoughts:**
We've prepared extensively for this migration. We've tested thoroughly in staging. We have a solid rollback plan. We have a great team.

Trust the process. Trust the runbooks. Trust each other.

Let's do this! 🚀

[Migration Lead Name]

---
**See you Saturday morning at 7:30 AM for pre-migration briefing.**
```

---

## 13. Incident Alert (Internal)

**To:** All Team Members
**Subject:** 🚨 INCIDENT: Migration Issue Detected
**Channel:** Slack, SMS, Phone Call

```markdown
🚨 INCIDENT ALERT 🚨

**Priority:** [P1-Critical / P2-High / P3-Medium]
**Status:** Active
**Time:** [TIME]

**Issue:**
[Brief description of the problem]

**Impact:**
[Who/what is affected]

**Action Required:**
- All hands on deck
- Join emergency bridge: [Conference Number]
- Check Slack #migration-war-room for updates

**Assigned To:** [Name]
**Monitoring:** [Names]

**Next Update:** [TIME]

---
**Do NOT leave until all-clear given**
```

---

## 14. Post-Mortem Invitation

**To:** All Team Members, Stakeholders
**Subject:** PostgreSQL Migration Post-Mortem Meeting
**Channel:** Email, Calendar Invite

```markdown
Subject: PostgreSQL Migration Post-Mortem Meeting

Team,

Great work on completing the PostgreSQL migration!

Let's gather to discuss what went well, what didn't, and what we learned.

**Meeting Details:**
- **Date:** [Date - within 1 week of completion]
- **Time:** [Time]
- **Duration:** 2 hours
- **Location:** [Room / Zoom Link]
- **Facilitator:** [Name]

**Agenda:**
1. Timeline Review (15 min)
2. What Went Well (30 min)
3. What Didn't Go Well (30 min)
4. Root Cause Analysis (20 min)
5. Lessons Learned (15 min)
6. Action Items (10 min)

**Please Prepare:**
- Review your notes from the migration
- Think about:
  - 3 things that went well
  - 3 things that could be improved
  - 1 key lesson learned
- Be ready to share specific examples

**Pre-Read Materials:**
- Migration final report (attached)
- Timeline document (attached)
- Metrics dashboard (link)

**Goal:**
Document our learnings to make future migrations even smoother.

**Attendance:**
This meeting is mandatory for all team members who participated in the migration.

See you there!

[Organizer Name]

---
**Can't attend? Please send your input to [email] before the meeting.**
```

---

## Status Page Messages

### During Migration

```html
<!-- Maintenance Page -->
<html>
<body style="font-family: Arial; text-align: center; padding: 50px;">
  <h1>🔧 Scheduled Maintenance</h1>
  <p style="font-size: 18px;">NextCRM is currently undergoing a database infrastructure upgrade.</p>

  <p><strong>Expected Back Online:</strong> Sunday, November 7 at 10:00 AM EST</p>

  <p>We're migrating to PostgreSQL to improve performance and reliability.</p>

  <div style="margin: 30px 0;">
    <div style="background: #f0f0f0; padding: 20px; border-radius: 10px; max-width: 500px; margin: 0 auto;">
      <p style="font-size: 24px; margin: 0;"><strong>45% Complete</strong></p>
      <div style="background: #ddd; height: 30px; border-radius: 15px; margin-top: 10px;">
        <div style="background: #4CAF50; height: 100%; width: 45%; border-radius: 15px;"></div>
      </div>
    </div>
  </div>

  <p>Thank you for your patience.</p>

  <p><a href="https://status.nextcrm.com" style="color: #4CAF50;">View Detailed Status Updates →</a></p>

  <p style="font-size: 12px; color: #666; margin-top: 50px;">
    Questions? Email support@nextcrm.com
  </p>
</body>
</html>
```

---

**End of Communication Templates**

These templates should be customized with specific details before sending. Store them in an accessible location for quick access during the migration.
