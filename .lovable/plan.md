# Member profile links throughout Afrixa

## Goal
Make it possible to open the correct member profile by selecting that person’s name or photo wherever member identities appear in the signed-in app.

## Implementation
- Review member identity displays and link any currently unlinked names/photos to the existing `/talent/$id` profile page.
- Cover connection requests, people suggestions, feed comment authors, chat inbox participants, and contract counterparties; preserve existing actions such as accepting requests and opening chats.
- Keep existing profile links and leave the signed-in user’s own profile/editor controls unchanged.

## Verification
- Check the preview interactions for representative people, comments, chat participants, and contract counterparties.
- Confirm the app builds and review the preview error log.

## Technical details
Use TanStack Router `Link` with the existing `/talent/$id` route and the matching profile ID. Where an inbox row also opens a conversation, make profile name/photo links separate from the conversation link to avoid nested links.
