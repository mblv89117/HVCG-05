# TRACK3 — Website Go-Live Package (execution)

## Platform decision (recommended)
**Phase A (now):** Static site from `preview/` (local `http://127.0.0.1:8765`) — zero purchase.  
**Phase B (CEO approve):** Azure Static Web Apps **or** SharePoint Comm Site + Microsoft Forms — org tenant, HTTPS.  
**Phase C:** Public DNS only after GL-PUBLISH-1.

## Preview
```bash
./docs/business-launch/go-live/track3-website/serve_preview.sh
# → http://127.0.0.1:8765/index.html
```
31 HTML pages · sitemap.xml · robots Disallow · noindex · Soft UAT 834/0.

## Still mock / not live
- Microsoft Forms / Power Automate CRM write  
- Real booking (Bookings)  
- Public domain / HTTPS edge  
- Spam protection (Beyond local)  
- Production analytics  
- Secure-upload guest links  

## Required before public
See `LAUNCH_CHECKLIST.md` · DNS · purchases · Form-routing · CRM map (below).
