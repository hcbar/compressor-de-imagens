# Local privacy and failure diagnostics

Before changing the privacy claim, main `8b9e0e9` was inspected and exercised in Chromium through real compression and download. Processing uses bounded File/Blob reads, native image decoding, canvas codecs and local blob URLs. Only same-origin static GET requests were observed, with no bodies, file-data sends or WebSockets. The selected product profile remains `local`; the existing optional health Worker is not used by the interface and was not changed.

The requested EN/PT/ES notice is beside the file selector, with an accessible optional explanation. Selection is called Choose image / Escolher imagem / Elegir imagen. No new service, external dependency, analytics or persistent storage is added.

Version 0.1.1 shows stable IC_* codes and a read-only report. The diagnostic has a closed schema: tool, app version, normalized stage, code and category. There is no structural path for this native-image pipeline. File names, image content, sizes/dimensions, metadata, URLs, hashes, stacks and raw exceptions are ignored. Unknown failures use IC_PROCESSING_FAILED; size/pixel/target limits are classified as limits. Native decode errors are wrapped with a fixed error code; compression search and target behavior remain unchanged. Preview failure hides the invalid result.

Reports exist only in the current interface state and are cleared on file/target changes or page exit. Copy is explicit through the Clipboard API; if unavailable/denied, the report opens and is selected for manual copying. Nothing is automatically sent. The static diagnostic version is checked against package.json by a unit test.

The existing CI invokes the extended Python Playwright harness: only static GETs throughout compression/download and diagnostics/copy; private sentinels excluded from reports; real clipboard and denial fallback; EN/PT/ES at desktop/mobile sizes; replacement after errors; conversion, rendering and export fault injection. Existing real-codec, alpha, cancellation, hard-byte-limit and localized flows remain. Unit tests cover normalization, native DOMException handling and documented limit categories. Exact results and commit are in the draft PR.

Verification covers the application build, not extensions or the user's device. No independent audit, merge or deployment is included.
