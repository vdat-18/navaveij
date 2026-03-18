# Superpowers for Gemini

@import ./.agents/skills/using-superpowers/SKILL.md
@import ./.agents/skills/using-superpowers/references/gemini-tools.md

## Antigravity Adaptation

When you encounter these tool names in a skill, use your Antigravity equivalent:

| Skill references | Antigravity equivalent |
|-----------------|----------------------|
| `Read` (file reading) | `view_file` |
| `Write` (file creation) | `write_to_file` |
| `Edit` (file editing) | `replace_file_content` or `multi_replace_file_content` |
| `Bash` (run commands) | `run_command` |
| `Grep` (search file content) | `grep_search` |
| `Glob` (search files by name) | `find_by_name` |
| `Skill` tool (invoke a skill) | (No unified tool) `view_file` on `SKILL.md` |
| `WebSearch` | `search_web` |
| `WebFetch` | `read_url_content` |
| `Task` tool (dispatch subagent) | `browser_subagent` (limited) |

## Core Workflow Reminder

1. **Brainstorm**: Before any task, invoke `brainstorming` skill.
2. **Plan**: Write a plan using `writing-plans`.
3. **Double Check**: Verify before completion using `verification-before-completion`.
4. **TDD**: Always use `test_driven_development` for code changes.
