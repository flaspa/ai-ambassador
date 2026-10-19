# CLAUDE.md — Hackathon Development Instructions
## Claude's development rules

@AGENTS.md
@HACKATHON.md

## 1. Mission: Maximum Results, Minimum Time

This project is being developed for a time-constrained AI hackathon.

**Your objective is to deliver maximum demonstrable functionality in minimum time.**

The target is **demo-quality software, not production-quality software**.

Prioritize, in order:

1. A working end-to-end demonstration.
2. The core functionality that makes the product compelling.
3. Reliable integration of the required technologies.
4. A clear, usable interface.
5. Readable, maintainable code.

**A working demo is more valuable than sophisticated but unfinished software.**

Optimize for demonstrable results, not architectural perfection.

## 2. Coding Principles

- Write simple, effective, readable code.
- Prefer straightforward implementations over elaborate abstractions.
- Use existing libraries instead of reinventing functionality.
- Minimize files, dependencies, configuration, and setup steps.
- Avoid premature optimization, unnecessary refactoring, and speculative features.
- Avoid enterprise patterns, excessive abstraction, and unnecessary infrastructure.
- Reuse working code whenever possible.
- Use descriptive names and short, understandable functions.
- Add comments only where the intent is not obvious.
- Prefer the simplest technology stack that meets the demo requirements.

**Do not sacrifice readability to save a few lines of code.**

## 3. Time Management and Scope Control

Time is the primary constraint.

- Build the smallest working version first.
- Implement vertical slices: input → agent reasoning → tool execution → visible result.
- Prioritize features according to their impact on the live demonstration.
- Do not expand scope without approval.
- Prefer a simple working solution over an incomplete sophisticated solution.
- If an implementation becomes complicated, propose a simpler alternative.
- Avoid polishing features that do not improve the demonstration.

### Time Limits

- **Testing and debugging: ONE shared three-minute (180-second) budget per task.** Track cumulative elapsed time across testing, verification builds, debugging, retries, command waits, and delegated checks. This is not three minutes for testing plus another three minutes for debugging.
- **Stop at the earlier of 180 seconds or two unsuccessful debugging attempts.** At that point, safely stop any running commands or delegated checks you started, report the problem, evidence, incomplete work, and fastest viable alternative, and ask for explicit approval before continuing testing or debugging that task.
- Set command and delegated-check execution limits to the remaining budget and use short polling intervals. Do not start a check that cannot fit within it.
- Do not reset the budget or attempt count by switching commands, tools, agents, or subtasks for the same underlying task. A debugging attempt is one proposed fix followed by verification; an unsuccessful verification counts as a failed attempt.
- **No exceptions for nearly finished work.** Do not continue testing or debugging after either limit without explicit approval. If continuation is approved, agree on a new time budget before resuming.
- **Dependencies:** If an integration takes more than 10 minutes to configure, propose a fallback.
- **UI polish:** Defer cosmetic improvements until the core workflow works.

The dependency setup threshold does not extend the testing/debugging budget. These stop rules take precedence over routine autonomy and verification instructions elsewhere in this file. If verification cannot finish within the budget, report the result as unverified.

## 4. Maintain a Runnable Application

**Keep the application working throughout development.**

- Establish a runnable baseline as early as possible.
- Implement one functional milestone at a time.
- Whenever practical, leave the application runnable after every milestone.
- Verify that new functionality does not break the existing demo.
- Prefer incremental changes over large rewrites.
- Do not replace working functionality with an unverified alternative.
- Preserve a known-good version before risky changes.
- If the application breaks, prioritize restoring the working version.
- Maintain a simple command for starting the application.
- Keep the README's setup and run instructions accurate.

**The number of working features matters more than the amount of code written.**

## 5. Testing and Verification

**Test enough to make the demo work. Do not overtest.**

- Run a quick smoke test after meaningful changes.
- Run existing relevant tests when practical, within the shared testing/debugging budget in Section 3.
- Test the main user workflow end to end.
- Check that external APIs return usable results.
- Verify that the application starts without errors.
- Fix issues that directly affect the demonstration.
- Do not create extensive new test suites unless requested.
- Avoid elaborate mocks, test infrastructure, and exhaustive edge-case coverage.
- Ignore unrelated warnings and pre-existing issues unless they block the demo.
- Do not introduce a new testing framework without approval.
- Never claim a feature works without verifying it.

Use simple manual verification when it is faster and sufficient.

**Do not ask me to perform tests that you can reasonably execute yourself.**

## 6. Agent and API Integrations

The hackathon highlights Cline, Composio, Parallel, and open-source models.

Read `HACKATHON.md` for event requirements, `REQUIREMENTS.md` for approved product scope and acceptance criteria, and `PLAN.md` for implementation milestones.

- Give each selected tool a meaningful role.
- Prefer official SDKs and documented APIs.
- Use the simplest supported integration method.
- Verify a basic API call before building complex functionality.
- Make agent reasoning, tool calls, and results visible in the demo where useful.
- Display meaningful errors rather than failing silently.
- If an external service fails, explain the issue and propose a demo-safe fallback.
- Clearly distinguish live functionality from simulated behavior.
- Never hardcode API keys or credentials.
- Store local secrets in `.env` and exclude them from Git.
- Never expose credentials in logs, screenshots, or demo output.

Do not add agent frameworks or orchestration layers unless they directly improve the demonstration.

## 7. Autonomy and Decision-Making

**Act independently on routine implementation, testing, debugging, and Git operations within the approved plan.**

Do not interrupt development for routine decisions.

You may independently:

- Choose straightforward implementation details.
- Install necessary dependencies within the approved technology stack; introducing a major dependency requires prior approval unless it is already explicitly approved in `PLAN.md` or `ARCHITECTURE.md`.
- Create and modify files needed for approved tasks.
- Run development servers and appropriate lightweight tests.
- Fix ordinary coding errors.
- Stage, commit, and push completed milestones.
- Update development documentation and progress records.

Ask for approval before:

- Changing the agreed product scope substantially or making an architectural change not already explicitly approved in `ARCHITECTURE.md`.
- Introducing a major dependency or framework not already explicitly approved in `PLAN.md` or `ARCHITECTURE.md`.
- Continuing testing or debugging beyond either stop limit in Section 3.
- Introducing significant costs or paid services.
- Performing destructive or irreversible operations.
- Deleting user data or overwriting unrelated work.
- Publishing information or contacting external users.
- Sending emails, messages, or triggering transactions.
- Making changes that affect external accounts or services beyond approved development and repository operations.

When approval is required, explain the decision briefly and recommend the fastest viable option.

**Default behavior: execute approved work rather than repeatedly asking permission.**

## 8. Working with PLAN.md

`PLAN.md` contains the approved implementation plan.

Before coding:

1. Read `REQUIREMENTS.md` and `PLAN.md`.
2. Identify the next incomplete task.
3. Confirm that it contributes to the working demo.
4. Implement the task without expanding scope.

Follow the approved milestones.

- Work incrementally.
- Do not implement the entire application in one uncontrolled operation.
- Keep the application runnable between milestones when practical.
- Propose substantial changes to the plan before implementing them.
- Record approved deviations from the original plan.
- Explain architectural deviations and obtain approval before implementing them. When the actual system design changes, update `ARCHITECTURE.md` to record the approved design as implemented. Claude records implementation changes; Codex retains planning and design-review responsibility.

## 9. Progress Tracking

`PROGRESS.md` records actual implementation status.

Use the project-specific `progress-tracker` subagent when available.

After each meaningful milestone:

- Verify what was implemented and tested.
- Delegate a progress update to `progress-tracker`.
- Record completed work, current tasks, blockers, and next steps.
- Note meaningful deviations from `PLAN.md`.

Do not invoke the tracker after every small code edit.

The progress tracker must not modify application code or `PLAN.md`.

Subagents do not run continuously by default. Delegate progress tracking explicitly at milestone boundaries.

Before ending a development session, update `PROGRESS.md` so work can resume without reconstructing the conversation.

If the progress-tracker subagent is unavailable, update `PROGRESS.md` directly.

## 10. Concise Communication and Reporting

**Keep all reports short, readable, and actionable.**

Before implementing a meaningful task, explain the intended action in no more than 2–3 sentences.

Do not narrate every file edit, command, or internal decision.

After each task, report:

**Done:** What changed.

**Works:** What is verified to work, with brief evidence. Clearly label anything unverified.

**Incomplete:** What remains unfinished, or "None."

**Blockers/decisions:** Any blockers or decisions required, or "None."

Add Git status, the next task, or user-only testing steps only when useful. Do not ask the user to run checks you can perform within the approved budget.

### Reporting Rules

- Keep routine reports under 100 words, preferably under 60.
- Avoid lengthy technical explanations unless requested.
- Do not repeat information already communicated.
- Clearly distinguish verified functionality from assumptions.
- Keep necessary detailed implementation notes in the appropriate repository documents, such as `ARCHITECTURE.md` for design and `PROGRESS.md` for implementation status and verification evidence.
- If user testing is needed, provide exact commands, URLs, actions, and expected results.
- Do not ask me to repeat tests you can perform yourself.
- Report blockers early.
- Recommend the fastest viable solution first.
- Do not produce lengthy summaries or unnecessary documentation.

**A concise report followed by working code is preferable to a lengthy explanation.**

## 11. Git and GitHub Management

Claude is responsible for maintaining the GitHub repository throughout development.

Unless explicitly instructed otherwise:

- Check `git status` before committing.
- Stage only files relevant to the completed task.
- Avoid `git add .` when unrelated changes exist.
- Commit completed, coherent, verified milestones.
- Push commits to the configured remote repository.
- Use short, descriptive commit messages.
- Keep project instructions and progress records current.
- Verify that `.gitignore` excludes secrets and generated artifacts.
- Never commit API keys, credentials, `.env` files, or other secrets.
- Review staged changes for accidental secret exposure before committing.
- Do not overwrite or revert changes made by another agent or the user.
- Do not create unnecessary branches.
- Never force-push, rewrite history, delete branches, or amend published commits without approval.
- If a push fails, report the problem and the simplest corrective action.

### Commit Policy

- Commit after completed milestones, not every small edit.
- Push at milestone completion or before ending a session.
- Use the existing branch for the private rehearsal unless instructed otherwise.
- Follow event-specific repository and submission rules during the hackathon.

### Git Reporting

When relevant, report Git activity concisely.

Example:

**Done:** Implemented agent search and results UI.

**Works:** Main workflow verified by a smoke test.

**Incomplete:** Composio integration.

**Blockers/decisions:** None.

**Git:** Committed `a1b2c3d`, pushed to `main`.

**Next:** Connect Composio.

## 12. Demo-First Development

Always keep the live demonstration in mind.

A successful demo should show:

1. A clear user request or problem.
2. The personal agent taking meaningful action.
3. Real tool or API interactions.
4. A visible, useful result.
5. A concise explanation of what makes the solution different.

Prefer an end-to-end working demo over disconnected features.

### Protect the Demo

- Preserve the last verified working version.
- Avoid risky changes close to submission.
- Prioritize fixing visible failures over adding new features.
- Prepare sample inputs and a short demonstration flow.
- Confirm that the demo starts and completes reliably.
- Clearly label any simulated functionality.

When time is running out, prioritize:

1. Restore or preserve the working demo.
2. Fix failures in the main workflow.
3. Prepare the demonstration.
4. Commit and push the submission.
5. Add improvements only if time remains.

## 13. Definition of Done

A feature is complete when:

- It performs its intended function.
- It works within the main demo workflow.
- It passes an appropriate lightweight verification.
- It does not break previously working functionality.
- The application remains runnable whenever practical.
- Its status is recorded at the next progress checkpoint.

Production hardening, comprehensive testing, scalability, and elaborate architecture are outside the default scope.

## 14. Keep Project Instructions Lightweight

- Treat this file as the development operating manual.
- Keep detailed product requirements in `REQUIREMENTS.md`.
- Keep approved milestones and implementation order in `PLAN.md`.
- Keep actual progress in `PROGRESS.md`.
- Keep necessary implementation details in the appropriate repository documents instead of lengthy chat reports; avoid creating extra documentation without a clear need.
- Keep event requirements in `HACKATHON.md`.
- Avoid duplicating instructions across these files.
- Do not expand `CLAUDE.md` with routine implementation details.
- After the rehearsal, suggest removing rules that caused unnecessary overhead.
- Do not rewrite the project's operating instructions without approval.

---

**FINAL PRINCIPLE**

This is a hackathon.

**Deliver a working, readable, compelling demonstration as quickly as possible.**

Every minute spent engineering something the judges will not experience must be justified.

**Build → Verify → Update Progress → Commit → Continue.**
