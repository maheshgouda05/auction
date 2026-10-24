# IPL Auction Arena — Security Specification & Test Payloads

## 1. Data Invariants
1. Room documents can only be created by authenticated users (`request.auth.uid == incoming().hostId`).
2. Participants can only write or update their own participant document (`participantId == request.auth.uid`).
3. Only the room host can update room status, change rules, pause/resume, and advance rounds.
4. Bid updates and team state modifications must not exceed franchise purse or breach roster limits.
5. Messages must have senderId matching the authenticated user.
6. Default deny on all unmatched collections.

## 2. The Dirty Dozen Security Payloads
1. **Ghost Field Injection**: Adding `isAdmin: true` or `shadowField: "exploit"` to room document creation.
2. **Host Spoofing**: User B attempting to advance auction round or change rules when User A is `hostId`.
3. **Identity Impersonation**: User A attempting to update `/rooms/{roomId}/participants/{userB_id}`.
4. **Purse Forgery**: Participant attempting to arbitrarily increase their remainingPurse in `teamStates`.
5. **ID Poisoning Attack**: Passing a 2KB junk character string as `{roomId}` or `{participantId}`.
6. **Chat Sender Impersonation**: User A submitting a message with `senderId: "userB"`.
7. **Negative Bid Attack**: Submitting negative bids or NaN prices.
8. **Double Retention Overflow**: Exceeding the maximum allowed retentions for a team.
9. **Unauthenticated List Scraping**: Attempting to query rooms collection unauthenticated.
10. **Terminal State Tampering**: Modifying completed room outcomes after auction is closed.
11. **Foreign Franchise Hijacking**: Modifying another participant's chosen team ID.
12. **System Log Forgery**: Sending messages marked `isSystem: true` from a client device.
