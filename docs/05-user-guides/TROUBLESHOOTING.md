# Troubleshooting & Support Guide

## Before Contacting Support

Try these steps first to resolve common issues:

**General troubleshooting checklist:**
- [ ] Refresh your browser (Ctrl+R or Cmd+R)
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Try a different browser (Chrome, Firefox, Safari, Edge)
- [ ] Disable browser extensions
- [ ] Check internet connection
- [ ] Log out and log back in
- [ ] Check system status page: [status.nextcrm.io](https://status.nextcrm.io)
- [ ] Restart your computer

Most issues resolve with these steps.

---

## Authentication & Access Issues

### I Can't Log In

**Symptoms:**
- Login page won't accept credentials
- "Invalid email or password" error
- Page keeps redirecting to login

**Solutions:**

**Step 1: Verify credentials**
- Check email spelling (case-insensitive)
- Check password for typos
- Verify Caps Lock is off
- Ensure you're using correct organization login

**Step 2: Reset password**
1. Click "Forgot Password?" on login page
2. Enter email address
3. Check email for reset link
4. Reset password
5. Try logging in with new password

**Step 3: Check email verification**
- You may need to verify email first
- Check inbox (and spam) for verification link
- Click link to verify
- Then attempt login

**Step 4: Try different browser**
- Browser cookies might be corrupted
- Try Chrome, Firefox, Safari, or Edge
- Clear cookies and try again

**If still not working:**
- Contact support@nextcrm.io
- Include email address used
- Screenshot of error message

---

### Can't Create an Account

**Symptoms:**
- Signup form won't submit
- "Email already registered" error
- Verification email not received

**Solutions:**

**"Email already registered":**
- You may have account in different organization
- Try logging in instead
- If you forgot password: Use password reset
- If you want different account: Use different email

**Verification email not received:**
1. Check email inbox (and spam/junk folder)
2. Wait 5 minutes
3. Click "Resend verification"
4. Try again

**Can't complete signup:**
1. Check required fields are filled
2. Password must be 8+ characters
3. Try different browser
4. Disable browser extensions
5. Clear cache and try again

**Account created but can't access:**
- You may need email verification first
- Check for verification link
- Verification link expires after 24 hours
- Click "Resend verification" to get new link

---

### OAuth Not Working (Google/GitHub)

**Symbols:**
- "Google Sign In" button not working
- "GitHub Sign In" button not working
- OAuth popup not opening

**Solutions:**

**Check browser settings:**
- [ ] Popups not blocked (check browser popup blocker)
- [ ] Cookies enabled
- [ ] Third-party cookies enabled
- [ ] JavaScript enabled

**Try different browser:**
- OAuth sometimes has browser-specific issues
- Try Chrome, Firefox, Safari, or Edge

**Clear browser data:**
1. Clear cookies
2. Clear cache
3. Clear site data
4. Refresh page
5. Try again

**Check OAuth account:**
- Verify you have Google/GitHub account
- Google account verified
- GitHub account is public (not private)
- Both tied to email on NextCRM

---

### Session Expired / Logged Out

**Symptoms:**
- Automatically logged out
- "Session expired" message
- Redirected to login page

**Solutions:**

**Why it happens:**
- Session timeout (24 hours default)
- Another login from different device
- Security log out from admin
- Browser cleared cookies

**What to do:**
1. Log back in
2. Enter credentials again
3. Session reestablished
4. Continue working

**Prevent frequent logouts:**
- Check browser cookie settings
- Don't clear cookies while using NextCRM
- Check if another person logged in with your account
- On shared computer: Log out when done

---

## Data & Visibility Issues

### I Can't See My Data

**Symptoms:**
- Records missing
- Dashboard empty
- No accounts/leads/opportunities showing
- "No results" in every search

**Diagnostic steps:**

**Step 1: Check organization**
- Click organization name (top-left)
- Verify you're in correct organization
- Switch to correct organization if needed

**Step 2: Check role/permissions**
- Contact admin to verify your role
- May need higher role to see certain data
- Verify you have access to modules

**Step 3: Check filters**
- Click filters icon
- See if filters applied
- Clear all filters
- Try again

**Step 4: Check active/inactive toggle**
- Some modules show active/inactive records
- Make sure both are visible
- Toggle to show all records

**Step 5: Refresh and clear cache**
1. Refresh page (Ctrl+R)
2. Hard refresh (Ctrl+Shift+R)
3. Clear cache (Ctrl+Shift+Delete)
4. Close browser completely
5. Reopen and log in again

---

### Records Are Missing

**Symptoms:**
- Record was there yesterday, now gone
- Can't find specific account/lead
- Search returns nothing

**Solutions:**

**Check if deleted:**
1. Open module (CRM > Accounts)
2. Look for "Deleted Items" or "Trash"
3. See if record there
4. Can recover within 30 days
5. Click recover to restore

**Check if archived:**
- Some modules have archive option
- Check "Archived" section
- Unarchive if needed

**Check if permissions changed:**
- Admin may have restricted access
- Contact admin to verify permissions
- Ask admin to reshare record

**Check if in different organization:**
- Records isolated by organization
- Verify you're in correct organization
- Switch if needed

**Search thoroughly:**
- Use global search (Ctrl+K)
- Search by record name
- Search by associated company
- Use advanced filters

**If still missing:**
- Contact support@nextcrm.io
- Include record name/date created
- Admin may recover from backups

---

### Search Not Returning Results

**Symptoms:**
- Search finds nothing
- Used to work, now broken
- Specific search terms return nothing

**Solutions:**

**Refine search:**
- Too generic search may time out
- Try more specific terms
- Example: search "ABC" instead of "A"
- Full name instead of first name

**Check filters:**
- Filters may be applied
- View > Filters to see active filters
- Clear all filters
- Search again

**Clear search cache:**
- Refresh page
- Clear cache
- Try search again

**Advanced search:**
- Use filters instead of text search
- Filter by date range, type, owner
- Narrower filter = faster results

**Re-index search (if admin):**
- Settings > Advanced > "Reindex Search"
- Takes 5-10 minutes
- Search accurate after reindex

---

## Performance & Technical Issues

### NextCRM Is Slow / Taking a Long Time

**Symptoms:**
- Pages load slowly
- Actions take time
- Dashboard updates slowly
- Search takes >5 seconds

**Solutions:**

**Step 1: Check internet speed**
- Open speed test: speedtest.net
- Should be >10 Mbps download
- If slower: Contact ISP or move to better WiFi

**Step 2: Clear browser cache**
1. Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
2. Click "All time" for time range
3. Check "Cookies and other site data"
4. Check "Cached images and files"
5. Click "Clear data"

**Step 3: Close browser tabs**
- Too many tabs use memory
- Close unnecessary tabs
- Keep browser memory usage low

**Step 4: Disable browser extensions**
- Ad blockers sometimes slow pages
- Extensions use resources
- Try disabling all extensions
- Re-enable one by one to identify problem

**Step 5: Try different browser**
- Browser-specific performance issues
- Try Chrome, Firefox, Safari, Edge
- If faster in other browser: uninstall and reinstall original

**Step 6: Restart computer**
- Free up system memory
- Clear temporary files
- Reboot fixes most performance issues

**If still slow:**
- Check [status page](https://status.nextcrm.io) - possible server issue
- Contact support with: browser, OS, internet speed, number of records

---

### Page Won't Load

**Symptoms:**
- Blank page
- Page loading forever
- "Page not found" (404) error
- "Server error" (500) error

**Solutions:**

**Step 1: Hard refresh**
- Ctrl+Shift+R (Windows)
- Cmd+Shift+R (Mac)
- Wait for full load

**Step 2: Clear cookies and site data**
1. Settings > Cookies and site data
2. Find nextcrm.io
3. Click remove
4. Refresh page
5. Log in again

**Step 3: Try different browser**
- Browser-specific rendering issues
- Try Chrome, Firefox, Safari, Edge

**Step 4: Check internet connection**
- Open different website
- If other sites don't load: Internet issue
- Restart WiFi/ethernet
- Try mobile hotspot

**Step 5: Check status page**
- [status.nextcrm.io](https://status.nextcrm.io)
- Server downtime?
- Scheduled maintenance?
- Known incidents?

**Step 6: Check browser console**
1. Press F12 to open developer tools
2. Click "Console" tab
3. Look for red errors
4. Screenshot errors
5. Email to support@nextcrm.io

---

### Buttons Not Working / Can't Click Anything

**Symptoms:**
- Click button, nothing happens
- Buttons seem disabled
- Interface freezes

**Solutions:**

**Wait for loading:**
- Page may still loading
- Small loading spinner often visible
- Wait 5-10 seconds
- Buttons enabled after load

**Refresh page:**
1. Press Ctrl+R
2. Wait for full load
3. Try button again

**Check permissions:**
- You may not have permission
- Contact admin to verify
- May need higher role

**Clear cache:**
- Cache corrupted
- Ctrl+Shift+Delete
- Clear cache
- Close and reopen browser

**Browser console errors:**
1. Press F12
2. Click "Console"
3. Look for red errors
4. Screenshot and email support

---

## Email & Integration Issues

### Emails Not Syncing

**Symptoms:**
- Connected email account but no emails showing
- Emails in inbox don't appear in NextCRM
- "Email not connected" message

**Solutions:**

**Check connection status:**
1. Settings > Email Integration
2. See if account "Connected" or "Error"
3. If error: Click "Reconnect"
4. Follow OAuth process again

**Check permissions:**
- Gmail/Outlook may require reauthorization
- Click "Reconnect"
- Grant all permissions requested
- Don't click "Cancel" during OAuth

**Wait for sync:**
- First sync takes 5-15 minutes
- Large inboxes (10k+ emails) take longer
- Check back after 15 minutes

**Check filters:**
- Some emails may be filtered
- Settings > Email > Filters
- Verify filter rules
- Add exceptions if needed

**Reconnect email:**
1. Settings > Email
2. Find connected account
3. Click "Disconnect"
4. Wait 1 minute
5. Click "Connect"
6. Follow OAuth
7. Grant permissions
8. Wait for sync

**If still not syncing:**
- Check email account not compromised
- Login to Gmail/Outlook directly
- Change password if needed
- Re-connect to NextCRM

---

### Emails Not Auto-Linking

**Symptoms:**
- Emails received but not linked to CRM records
- Manual linking required
- Auto-linking not working

**Solutions:**

**How auto-linking works:**
- Sender email matched to contact email
- If match found: Auto-link
- If no match: No auto-link (manual needed)

**Ensure auto-linking enabled:**
1. Settings > Email
2. Check "Auto-link emails to CRM" enabled
3. If unchecked: Enable it

**Check contact email:**
- Sender email must match contact email exactly
- No partial matches
- Check contact has email address saved

**Add sender as contact:**
- Email from unknown sender won't link
- Create contact first
- Use exact email from email sender
- New emails will auto-link

**Manual linking:**
1. Open email
2. Click "Link to CRM"
3. Select account/lead/contact
4. Click "Link"

---

### Email Tracking Not Working

**Symptoms:**
- "Opens" and "Clicks" show 0
- Tracking pixels not loading
- Links not tracking clicks

**Solutions:**

**Tracking limitations:**
- ~30-40% of email clients block tracking
- Outlook often blocks pixels
- Gmail sometimes blocks pixels
- Corporate firewalls may block

**Verify tracking enabled:**
1. Settings > Email
2. Check "Enable email tracking" ON
3. Check "Track opens" ON
4. Check "Track clicks" ON

**Check email headers:**
1. Open sent email
2. Click "View Source"
3. Look for tracking pixel URL
4. Should include nextcrm.io domain

**Test tracking:**
1. Send test email to yourself
2. Open email
3. Click link in email
4. Check NextCRM for tracking
5. Should see "Opened" and "Clicked"

**Client limitations (can't fix):**
- Gmail: Blocks most pixels
- Outlook: Blocks some pixels
- Corporate email: Often blocks
- Workaround: Check email reply instead

**If legitimate issue:**
- Contact support@nextcrm.io
- Include email header
- Include tracking settings screenshot

---

## Import & Export Issues

### Import Failed

**Symptoms:**
- Import process started but failed
- Error message appeared
- Records not imported

**Solutions:**

**Check file format:**
- Must be CSV or Excel (.xlsx)
- Other formats not supported
- Export as CSV if unsure
- Try both formats

**Check required fields:**
- Some fields required (varies by module)
- Accounts: Name required
- Leads: Name, email required
- Verify all required fields in file

**Check field names:**
- File headers must match system fields
- Case-insensitive (EMAIL works, email works)
- Extra spaces in headers can cause issues
- Remove extra spaces if needed

**Check data format:**
- Dates: MM/DD/YYYY format
- Numbers: No $ or commas
- Currency: Numbers only (99.99)
- Emails: Valid format (name@domain.com)

**Check for duplicates:**
- System may reject duplicates
- Remove duplicate rows
- Or allow update existing

**Split large imports:**
- Importing 100k+ records may fail
- Split into smaller files (5k-10k records)
- Import each file separately

**View error details:**
1. Check error message
2. Often shows line number and field
3. Fix issue in that row
4. Re-import

**Contact support if:**
- Error message unclear
- File format correct but still fails
- Email support@nextcrm.io with:
  - Error screenshot
  - Sample data file (first 10 rows)
  - Total record count

---

### Export Not Working

**Symptoms:**
- Export button not responding
- File download doesn't start
- Empty or corrupted file downloaded

**Solutions:**

**Check permissions:**
- May need Admin role to export
- Contact admin if denied
- Verify role allows export

**Browser download settings:**
1. Check browser download settings
2. Downloads folder location
3. File downloaded but hidden
4. Look in Downloads folder

**Try different format:**
- Try CSV instead of Excel
- Try Excel instead of CSV
- Retry download

**Large exports:**
- Very large exports (100k+ records) may timeout
- Export in smaller chunks
- Use filters to reduce results
- Export by date range

**Check browser console:**
1. F12 > Console
2. Look for errors
3. Screenshot
4. Send to support

**Retry steps:**
1. Refresh page
2. Clear cache
3. Try export again
4. Wait up to 5 minutes for download

---

## System Status & Incidents

### Check NextCRM Status

**Status Page:** [status.nextcrm.io](https://status.nextcrm.io)

**Information available:**
- All systems operational (green) or issues (red)
- Current incidents
- Planned maintenance
- Historical uptime
- Response times

**Subscribe for updates:**
1. Go to status page
2. Click "Subscribe"
3. Choose notification method:
   - Email updates
   - SMS alerts
   - Slack integration
   - Webhook

---

## Contacting Support

**When to contact support:**
- Issue persists after troubleshooting
- Error message unclear
- Suspected bug or security issue
- Need assistance beyond this guide

**Support Channels:**

**Email:**
- support@nextcrm.io
- Response time: 24-48 hours (PRO), 4 hours (ENTERPRISE)

**Chat (PRO/ENTERPRISE only):**
- In-app chat widget
- Response time: 1-2 hours

**Community Forum:**
- [forum.nextcrm.io](https://forum.nextcrm.io)
- Community members help
- Response time: Varies

### Information to Provide

Help us help you faster:

**Always include:**
- Email address
- Organization name
- Browser and version
- Operating system
- Error message (exact text)
- Screenshot of issue

**When relevant:**
- Steps to reproduce issue
- Sample data (if import issue)
- Timestamps (when issue occurred)
- Recent account changes
- Recent data changes

**Example:**
> Subject: Can't export accounts
>
> Email: john@acmecompany.com
> Organization: Acme Sales
> Browser: Chrome 120.0.0.0
> OS: Windows 11
> Error: "Export failed - Please try again"
> Steps: Settings > Accounts > Export > Choose Excel > Click Export > Error appears
> Attempted: 2024-01-15 at 2:30 PM EST

---

## Advanced Troubleshooting

### Clear Browser Cache Completely

**Windows:**
1. Press Ctrl+Shift+Delete
2. Time range: All time
3. Check:
   - Cookies and other site data
   - Cached images and files
4. Click "Clear data"
5. Close browser completely
6. Reopen and log in

**Mac:**
1. Press Cmd+Shift+Delete (may need Fn+Cmd+Shift+Delete)
2. Or: Safari > Settings > Privacy > Manage Website Data
3. Find nextcrm.io
4. Click Remove
5. Empty Safari cache
6. Restart Safari

### Check Developer Console

**Open developer tools:**
- Windows: F12 or Ctrl+Shift+I
- Mac: Cmd+Option+I
- Right-click page > Inspect

**Check for errors:**
1. Click "Console" tab
2. Look for red error messages
3. Note error text
4. Screenshot
5. Email to support

**Common errors:**
- CORS errors: Browser security issue
- 404 errors: Missing resource
- 500 errors: Server issue
- Network errors: Connection issue

### Disable Browser Extensions

**Chrome/Edge:**
1. Settings (≡) > More tools > Extensions
2. Temporarily disable all
3. Refresh NextCRM
4. Try again
5. Re-enable extensions one-by-one to find culprit

**Firefox:**
1. Settings (☰) > Add-ons
2. Find extension
3. Click "Disable"
4. Refresh NextCRM
5. Try again

---

## Still Need Help?

**Next steps:**
1. Review this guide again
2. Check [FAQ.md](FAQ.md) for common questions
3. Search [knowledge base](https://nextcrm.io/docs)
4. Ask in [community forum](https://forum.nextcrm.io)
5. Contact support@nextcrm.io

**Be specific:**
- Describe exactly what happened
- Include error messages
- Provide screenshots
- List troubleshooting steps tried

**Response times:**
- FREE: Community forum only
- PRO: Email support (24-48 hours)
- ENTERPRISE: Chat (1-2 hours)

We're here to help! 🎉
