# Phase 4B-2 Known Limitations (post-hardening)

1. Cold ClamAV database load can make the first scans slow (tens of seconds).  
2. Deep model latency is host-load dependent; budget up to several minutes under contention.  
3. Password-protected Office crypto round-trip is still a marker, not full ECMA encryption.  
4. Multi-document packs are process-memory only.  
5. Page thumbnails are not rendered in Elite UI.  
6. `freshclam` may log `NULL X509 store` warnings on this Homebrew install; CVD tests still passed.  
7. ClamAV config/definitions live outside the repo and must be maintained on the machine.
