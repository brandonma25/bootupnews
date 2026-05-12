# Engineering Templates

This folder contains reusable engineering and governance templates for work that benefits from a stable process artifact instead of an internal worklog or one-off prompt packet. These templates are meant to be readable by a reviewer and reusable by LLM coding agents during implementation planning.

The first template is [LLM Prompt Template — Change Classification & Governance](llm-prompt-template-change-classification.md). Use it at the top of an implementation prompt, issue, or pull request planning note when the work could be confused with a different governance path. It is especially useful when a code diff might look like a new feature, but the declared task is actually remediation, alignment, refactor, bug-fix, or hotfix work.

The template asks for an explicit change type, source of truth, governance rules, and validation expectations before changes begin. That structure helps prevent LLM coding agents from treating remediation/refactor/bug-fix work as net-new feature work that needs a new canonical PRD.

This does not claim the process was perfectly followed from day one. It captures the reusable pattern that emerged as the project needed clearer governance around fast, AI-assisted implementation.
