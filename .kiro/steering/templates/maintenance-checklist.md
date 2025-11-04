---
title: "Documentation Maintenance Checklist"
type: "reference"
audience: "all"
estimated_time: "5 minutes read"
description: "Checklist for maintaining documentation quality, accuracy, and compliance with methodology standards"
prerequisites:
  - "None"
related_docs:
  - ".kiro/steering/diataxis-documentation.md"
  - ".kiro/steering/templates/content-guidelines.md"
last_updated: "2025-11-03"
---

# Documentation Maintenance Quick Reference

## Before Writing: Ask These Questions

1. **Will this number change if we add/remove code?** → Make it generic
2. **Is this an implementation detail or user capability?** → Focus on capabilities  
3. **Will this version requirement evolve?** → Use "latest LTS" or "supported versions"
4. **Is this a system constraint or current state?** → Keep constraints, generalize state

## Quick Substitutions

| ❌ Avoid | ✅ Use Instead |
|----------|----------------|
| "78+ tests" | "comprehensive test suite" |
| "Node.js 22+" | "Node.js (latest LTS)" |
| "36 functional tests" | "comprehensive functional tests" |
| "4 test suites" | "multiple specialized test suites" |
| "version 22+ required" | "supported version required" |

## Keep These (They're Fine)

- ✅ Time estimates: "15 minutes", "30 minutes setup"
- ✅ API constraints: "TTL (1-720 hours)", "Default: 24 hours"  
- ✅ Example output: `v20.10.0` in command examples
- ✅ User guidance: "Files: 12 files, 3 directories" in realistic examples

## Red Flags During Review

- Specific test counts anywhere
- Version numbers in requirements  
- Internal metrics exposed to users
- "Currently has X" statements
- Hard-coded numbers representing current implementation state

## The Golden Rule

**If it represents HOW the code currently works → make it generic**  
**If it represents WHAT the system is designed to do → keep it specific**