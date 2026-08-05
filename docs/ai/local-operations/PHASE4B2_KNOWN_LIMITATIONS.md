# Phase 4B-2 Known Limitations

1. **ClamAV not installed** — gate blocks unless synthetic-test override; owner must authorize `brew install clamav`.  
2. Live Ollama enrichment path exists but automated tests use **mock** enrichment.  
3. True deskew limited on macOS without ImageMagick/PIL.  
4. Scanned/rotated/poor PDF fixtures are placeholders (near-empty PDFs) for path coverage.  
5. Password-protected Office is a marker fixture, not a full ECMA crypto round-trip.  
6. Page thumbnails in UI are not rendered (confidence/text metadata only).  
7. Multi-doc packs are in-memory (process lifetime), not durable store.
