# Do you need a Skill, or is CLAUDE.md enough?

The same instruction bytes were loaded as a native Skill or root `CLAUDE.md`, with a no-instructions arm.

On the 14-task informative subset, the paired Skill-minus-`CLAUDE.md` estimate was **-0.047**. The 95% confidence interval was **-0.223 to 0.129**. The point estimate slightly favors root `CLAUDE.md`; the interval includes zero and effects in either direction.

This is one model and one self-run comparison. It does not establish a general result about Skills, `CLAUDE.md`, SkillsBench as a whole, or other models. The estimate uses 14 informative tasks out of a flat 41-task population and does not meet the official 21-unit / 13-cluster floor. Two host oracles failed and remain in the fail-closed 492-cell denominator.

The canonical signed report is `report-envelope.json` at `sha256:c66199af9e86dd9701f40c0a9d1fd8648dde4e50821f99335ce4052cfbb93583`. Run `npx @colophon-claims/verify@0.1 ./bundle` with the public npm reader to check the manifest, evidence closure, artifact integrity, signatures, matrix rederivation, report verification, and claim consistency.

Protocol identifiers under `https://spec.jinn.network/` are names; that origin is not hosted yet. Verification uses the exact platform bytes installed from npm.

See `presentation.json` for the public reading record and `claim-package.json` for the authenticated machine-readable claim closure.
