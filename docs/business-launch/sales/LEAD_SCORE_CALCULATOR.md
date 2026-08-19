# LEAD_SCORE_CALCULATOR

**Division:** Sales  
**Input:** EVA staging JSON (`composite_score_proxy`, band, capital, timeline)  
**Output:** LeadScore 0–100 + recommended SKU  

| Signal | Points |
|--------|--------|
| Band A / score ≥75 | +40 |
| Band B / score 55–74 | +25 |
| Band C | +10 |
| Timeline urgent / 0–90d | +20 |
| Revenue $3–10M or $10M+ | +15 |
| Books monthly+ | +15 |
| Decision-maker Owner/CFO | +10 |
| Capital intent debt/equity/both | +10 |

**Thresholds:** ≥70 Sales Priority · 40–69 Nurture · &lt;40 Educate  
**Legacy names matched to register:** BLOCK — do not HVCG-price  

**Next task generated:** Tiny script `score_eva_json.py` to score downloaded EVA JSON files.
