---
name: bdd-setup
description: >-
  Explicitly initialize a project's executable BDD/Cucumber toolchain. Detects the language,
  package manager, build system, existing test stack, and current official installation path;
  proposes dependency/config changes before applying them, then proves the runner with a neutral
  smoke feature. Load only when the user asks to initialize BDD, install Cucumber, or make feature
  files executable. Never runs automatically from the-line or bdd.
---

# bdd-setup: initialize executable BDD tooling

## Boundary

This skill installs and proves the **toolchain**. It does not decide product behavior or formulate
business scenarios.

- `bdd` owns Discovery/Formulation and behavior examples.
- `bdd-rt` gates those examples.
- `bdd-setup` installs/configures an executable runner only on explicit request.
- `the-line` may report that tooling is absent, but it never invokes this skill automatically.

Dependency installation, build-file changes, generated configuration, and package scripts are
external project mutations. Present the complete proposal and commands before applying them.

## Triggers

- "initialize BDD for this project"
- "install/setup Cucumber"
- "make `.feature` files executable"
- "configure Cucumber.js / Cucumber-JVM / Ruby Cucumber"

Do not trigger because a route selected BDD or because the repository contains Gherkin prose.

## Discovery

Inspect before recommending anything:

1. Language/runtime and versions.
2. Package manager/build system and lockfile.
3. Existing test framework, scripts, source layout, and CI commands.
4. Existing Cucumber/Gherkin dependencies, configuration, feature files, and step definitions.
5. Monorepo/package boundary where BDD belongs.
6. Current official installation documentation for the detected implementation.

Never assume one universal package. Cucumber installation is ecosystem-specific:

- JavaScript/TypeScript commonly uses local `@cucumber/cucumber` development dependencies.
- JVM projects use coordinated `io.cucumber` Maven/Gradle test dependencies.
- Ruby projects use Bundler and the Ruby Cucumber initializer.
- Other ecosystems require their own maintained implementation and runner conventions.

Do not use a global Cucumber installation: support code must load the project's local dependency.

## Proposal contract

Before writing or installing, present in one briefing:

```text
Detected stack:
- language/runtime
- package manager/build tool
- existing test framework
- existing BDD tooling: yes/no

Recommended implementation:
- package/plugin and version source
- why it matches the repository
- files/scripts to add or modify
- install and verification commands
- alternatives considered

Authorization boundary:
- dependency commands
- generated files
- CI/package-script changes
```

If the user has not authorized dependency installation, stop after the proposal. Do not silently
install, switch package managers, update unrelated dependencies, or create a global tool.

## Minimal setup

After authorization, create only the smallest coherent setup:

- local test dependency/plugin;
- conventional feature and step-definition directories for the ecosystem;
- minimal runner configuration only when defaults are insufficient;
- one package/build command aligned with existing repository conventions;
- one neutral smoke feature and step definition proving discovery and execution.

The smoke scenario tests the harness, not business logic:

```gherkin
Feature: BDD test harness

  Scenario: The runner executes a project step
    Given the BDD harness is initialized
    When the smoke scenario runs
    Then the scenario completes successfully
```

Do not invent real product scenarios during setup. The later `bdd` workflow owns them.

## Verification

Prove all relevant boundaries:

1. Dependency resolves from the project, not globally.
2. Runner command starts successfully.
3. Feature discovery includes the smoke feature.
4. Step discovery binds the smoke steps without ambiguity/undefined-step errors.
5. Smoke scenario passes.
6. Existing targeted tests still run when setup changes shared test configuration.
7. CI command or documented local command matches the installed runner.

Report exact commands and observed results. If the environment prevents installation or execution,
mark setup incomplete rather than claiming the project is BDD-ready.

## Existing tooling

If a compatible runner already exists:

- do not reinstall it;
- validate versions and current command;
- repair only concrete missing wiring;
- preserve established directory/config conventions;
- run the same smoke proof.

If an incompatible or abandoned implementation exists, present migration as a separate decision with
impact and rollback; do not replace it automatically.

## Completion output

- detected stack and selected Cucumber implementation;
- dependencies/config/scripts changed;
- feature/step locations;
- canonical run command;
- smoke result;
- existing-test regression result;
- remaining manual/CI work;
- explicit confirmation that no global install or unrelated dependency update occurred.
