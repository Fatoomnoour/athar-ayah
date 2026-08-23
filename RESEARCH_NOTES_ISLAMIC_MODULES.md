# External research notes

## Sources retrieved on 2026-08-23

1. Sunnah.com, Hisn al-Muslim: https://sunnah.com/hisn
   The page presents the Hisn al-Muslim collection with Arabic adhkar and hadith references. The extraction included examples for morning/evening remembrance, post-prayer recitation, sleep remembrance, travel wording, and Qur'anic protection passages. The page extraction did not reliably expose every individual reference link, so each item must be opened and verified before being added to the app.

2. Quran.com, Quranic Duas: https://quran.com/duas
   The page provides topic-based Quranic supplication collections, including daily life, forgiveness, repentance, knowledge, protection, travel, family, parents, patience, and other themes. Individual entries link to topic pages and must be mapped to an exact Qur'an reference before inclusion.

3. MDN, DeviceOrientationEvent: https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent
   Device orientation access may require an explicit user permission request and is subject to browser/device support. The implementation must request it from a direct user action where required, especially on iOS.

4. W3C, Device Orientation and Motion: https://www.w3.org/TR/orientation-event/
   Absolute orientation events depend on motion/orientation sensor permissions. The implementation must handle unavailable sensors and denied permissions without inventing a heading.

5. MDN, Navigator.share: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
   Web Share can invoke the device's native sharing mechanism and may be unavailable depending on browser/platform. The app therefore needs a download/copy fallback for shared adhkar images.

6. MDN, Web Share API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API
   The API supports sharing text, links, and files where the browser permits it. The sharing implementation must not include email, exact location, or other user-private data.

## Content safety notes

The retrieved sources are starting points, not an authorization to copy unverified text. The app must store each selected Arabic text, repeat count, source type, source title, exact reference, and source URL in a reviewable data file. No generated or paraphrased Arabic religious wording should be shipped as canonical content. User reflections remain separate and must be labeled as personal reflection, not tafsir.

Qibla calculations should use a documented fixed Kaaba coordinate and great-circle bearing formula. This is an engineering reference only; the UI must state that real-world accuracy depends on the device, calibration, magnetic interference, and permission state. Precise user coordinates should not be stored by default.

## Direct hadith references found for initial curation

- Sleep and waking remembrance: Sahih al-Bukhari 6312, https://sunnah.com/bukhari:6312. Search result identifies the wording beginning “Bismika amutu wa ahya” at bedtime and the waking remembrance beginning “Al-hamdu lillahil-ladhi ahyana…”. The exact Arabic must be copied from the source page during final content curation.
- Sleep remembrance variant: Sahih al-Bukhari 6324, https://sunnah.com/bukhari:6324. Search result identifies the bedtime wording and should be reviewed for the preferred canonical item.
- Travel remembrance: Riyad as-Salihin, Book 7, https://sunnah.com/riyadussalihin/7. Search result identifies the travel supplication collection; individual hadith reference should be selected from the page.
- Forgiveness: Riyad as-Salihin, Book 19, https://sunnah.com/riyadussalihin/19. Search result identifies a forgiveness supplication; an exact hadith reference must be selected before inclusion.

These results confirm candidate sources but do not replace item-level verification. No text should be committed solely from a search snippet.

## Additional direct references

- Post-prayer remembrance: Sahih Muslim 597a, https://sunnah.com/muslim:597a. The search result confirms the 33/33 remembrance report; use the exact Arabic from the source page and cite the hadith reference in the app.
- Entering the home: Sunan Abi Dawud 5096, https://sunnah.com/abudawud:5096. The search result identifies the narrated wording and the context of entering/leaving the home; verify exact Arabic before inclusion.
- Travel remembrance: Sahih Muslim 1342, https://sunnah.com/muslim:1342. The search result identifies the travel supplication and its wording context; verify the exact Arabic from the source page before inclusion.
- Morning/evening: https://sunnah.com/hisn. The search result contains Hisn al-Muslim entries and repeat guidance, but each item still needs page-level reference verification.
