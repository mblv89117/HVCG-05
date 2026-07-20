# Lessons learned

1. Disabled Azure subscriptions block SWA — validate `az account show` state early (Sprint 11).
2. Device-code auth expires mid-provision — refresh before long Dataverse/Azure jobs (Track 7).
3. Provider registration `--wait` can hang; register async then poll.
4. Free SWA regions ≠ resource group region (use westus2 for SWA).
5. Agents without a Ready queue stall on owner prompts — fixed by Sprint 12 orchestration.
