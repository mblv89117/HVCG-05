# Phase 5A Performance Report

Endpoint `GET /api/local-ai/eva/performance` reports:

- submissions, duplicates  
- average processing ms  
- Deep routing default (`glm-4.7-flash:q4_K_M`)  
- AI / validation failure counts  
- average estimated Manny review minutes  
- estimated Manny time saved  

Time-protection fields on each review: review minutes, time saved, high-value appearance, immediate attention, collect-more-info-before-Manny, batch recommended, likely duplicate/low value.  
Routine/incomplete submissions set `immediate_manny_attention=false` and prefer batching.
