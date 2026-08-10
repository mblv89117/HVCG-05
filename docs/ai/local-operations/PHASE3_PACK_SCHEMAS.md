# Phase 3 Pack Schemas

## Document review pack (`DocumentReviewPack`)

sourceDocumentTitle · documentType · client · project · sensitivityLevel · extractedTextPreview · redactedTextPreview · detectedDates · detectedAmounts · detectedObligations · detectedDeadlines · missingSignatures · missingPages · duplicationIndicators · injectionWarnings · requestedAiOperation · `draftOnly: true`

## Meeting — before (`MeetingBriefDraft`)

meetingObjective · backgroundSummary · currentProjects · openCommitments · missingDocuments · risks · decisionsRequired · recommendedTalkingPoints · agenda · atlasUpdatesSuggested · `draftOnly: true`

## Meeting — after (`MeetingOutcomesDraft`)

summary · decisions · tasks · owners · deadlines · clientCommitments · hvcgCommitments · unresolvedIssues · followUpEmailDraft (internal, never sent) · suggestedAtlasUpdates · `atlasRecordsUpdated: false` · `draftOnly: true`

## Client operations pack (`ClientOperationsPack`)

executiveSummary · activeProjects · missingDocuments · overdueCommitments · currentRisks · clientDependencies · hvcgDependencies · decisionsRequired · recommendedNextActions · tasksAiCouldHandle · tasksRequiringManny · tasksRecommendedForAutomation · tasksRecommendedForElimination · `draftOnly: true` · `authoritativeRecordsUpdated: false`

Code: `packages/atlas-integration-core/src/local-ai/{documentReviewPack,meetingWorkflow,clientOperationsPack}.ts`
