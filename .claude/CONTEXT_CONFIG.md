# NextCRM Context Configuration

Claude Code context management setup for NextCRM - Next.js 15 application.

## Quick Reference

- **Settings**: `.claude/settings.json` (tool permissions & ignore patterns)
- **Rules**: `.claude/context-rules.json` (token budgets & agents)
- **Hooks**: `.claude/hooks/context-init.js` (session initialization)
- **Commands**: `.claude/commands/context-optimize.md` (CLI command)

## Token Budget

| Scenario | Budget | Use Case |
|----------|--------|----------|
| Default | 150,000 | Regular development |
| Research | 170,000 | Complex analysis |
| Simple Fixes | 90,000 | Bug fixes |
| Documentation | 110,000 | Docs & comments |
| API Implementation | 140,000 | API work |

**Total Capacity**: 200,000 tokens
**Safety Buffer**: 60,000 tokens

## Active Agents

✅ Archon MCP - Task management
✅ Code-Mode MCP - IDE integration
✅ Next.js App Router Developer - Next.js specialist
✅ React Performance Optimization - Performance analysis

## File Search

- Max depth: 6 levels
- Max results: 25 files
- Parallel search: Enabled
- Priority: `src/app`, `src/components`, `src/lib`

## Auto-Compact

- Warning: 75% (150k tokens)
- Compact: 85% (170k tokens)
- Compression: Enabled

## Optimization

- Compress responses: Yes (>50KB)
- Batch tool calls: Yes
- Parallel execution: Yes
- Caching: Enabled (3600s TTL)

## Commands

```bash
/context              # Show token usage
/context-optimize     # Get recommendations
/doctor              # Diagnose issues
```

## Best Practices

1. Keep configuration checked in
2. Don't commit `.claude/.claude.json`
3. Review monthly
4. Document changes
5. Monitor usage with `/context`

## Support

- Check this file for details
- Run `/doctor` for diagnostics
- See `~/.claude/templates/README.md` for full reference

---

**Created**: 2025-11-17
**Project**: NextCRM
**Type**: Next.js 15
**Status**: Active
