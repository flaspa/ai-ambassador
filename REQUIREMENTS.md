# Requirements

**Status:** Initial draft. The product has not been selected; product scope and feature acceptance criteria remain pending approval.

Based on [HACKATHON.md](HACKATHON.md), which is the source for the supplied event description, organizer rules, and schedule. This document separates those rules from our rehearsal choices.

## Organizer Requirement

| ID | Requirement | Acceptance criterion |
|---|---|---|
| E-01 | Open source and share the actual hackathon submission. | The submission's open-source code is publicly available and a link has been shared. |

The rehearsal repository is currently private. E-01 applies to the actual hackathon submission.

## Encouraged Technologies

The event encourages Cline, Composio, Parallel, and open-source models. The supplied description does not specify a mandatory SDK, model, or detailed scoring rubric.

Practicing with all four technologies is our rehearsal objective. Their intended roles are Cline for development, Composio for application integrations, Parallel for web research, and an open-source model for agent reasoning. Final integration choices belong in [ARCHITECTURE.md](ARCHITECTURE.md).

## Rehearsal Objectives and Constraints

These are team choices derived from the rehearsal objectives and development principles in `HACKATHON.md`.

| ID | Requirement or objective | Acceptance criterion |
|---|---|---|
| R-01 | Demonstrate one useful personal-agent workflow from beginning to end. | A sample user request leads to meaningful agent action, tool execution, and a visible, useful result. The specific workflow is pending product selection. |
| R-02 | Practice the encouraged technologies and make their contributions clear. | Each technology's role and integration status are documented. Live and simulated behavior are clearly identified in the demo; any deferred integration is recorded in `PROGRESS.md`. |
| R-03 | Keep the implementation achievable within the 3.5-hour hacking window. | Milestones prioritize the smallest working demo. Rehearsal timing and any scope cuts are recorded in `PROGRESS.md`. See `HACKATHON.md` for the event schedule. |
| R-04 | Keep secrets out of Git and demo output. | Source, tracked configuration, logs, and demonstration output contain no exposed API keys or credentials. |
| R-05 | Preserve a runnable prototype and use lightweight verification. | Setup and start instructions are documented, the main demo workflow has been checked, and results and known limitations are recorded in `PROGRESS.md`. |

## Product Requirements Pending Selection

Resolve these before approving implementation milestones:

- **Target user:** TBD.
- **Problem and useful outcome:** TBD.
- **Core workflow:** TBD, including input, agent action, tool use, and visible result.
- **Must-have features:** TBD; give each feature an ID and an observable acceptance criterion.
- **Optional features:** TBD; prioritize only after the core workflow works.
- **Excluded features:** TBD for the selected product.
- **Demo scenario:** TBD, including sample input and expected result.

Default scope excludes production hardening, comprehensive test suites, scalability work, and unnecessary abstractions. Product-specific additions or substantial scope changes require approval.

## Document Responsibilities

- [HACKATHON.md](HACKATHON.md): Event description, organizer rules, and schedule.
- `REQUIREMENTS.md`: Product scope, constraints, and acceptance criteria.
- [PLAN.md](PLAN.md): Approved milestones and implementation order, referencing requirement IDs.
- [ARCHITECTURE.md](ARCHITECTURE.md): Technical design and integration decisions.
- [PROGRESS.md](PROGRESS.md): Actual completion, verification evidence, blockers, and deviations.

Once the product is selected, approve its scope and acceptance criteria here before implementation begins. This draft does not approve unspecified features.
