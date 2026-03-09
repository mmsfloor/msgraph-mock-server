# msgraph-mock-server

A Microsoft Graph-compatible mock server that serves Microsoft Teams chat history 
from a personal data export. Covers the chats and messages endpoints only. 
Switching from mock to the real Graph API requires changing only the base URL.

## Use cases

- Local development of applications that integrate with Teams chats
- Building and testing ingestion pipelines against real chat data
- Testing pagination offline
- Simulating delta sync endpoints
- Developing identity resolution and deduplication logic
- Prototyping without a corporate Azure AD account

## Scope

This server implements a small subset of Microsoft Graph API covering chat reading only.

Supported:

| Endpoint | Description |
|----------|-------------|
| `GET /v1.0/me/chats` | List all chats |
| `GET /v1.0/me/chats/:chatId` | Get chat by ID |
| `GET /v1.0/me/chats/:chatId/messages` | Get messages with pagination |
| `GET /v1.0/me/chats/:chatId/messages/delta` | Delta sync for a chat |
| `GET /v1.0/messages/delta` | Delta sync across all chats |

Not supported: sending messages, editing messages, reactions, mentions, channels, teams, files, presence, calendar, mail, or any other Graph resource.

Some Graph message properties are not currently implemented, including `hostedContents`, `mentions`, and `reactions`.

## Why this exists

Microsoft Graph API for Teams requires a corporate AAD account. Federated contacts and external users are not supported in the standard auth flow. This mock server replicates the Graph API endpoints using a Teams JSON export, enabling development without any Microsoft authentication.

## Data source

This server expects the Microsoft Teams personal data export downloaded from the [teams.live.com/dataexport](https://teams.live.com/dataexport). This is a specific export format and is different from eDiscovery exports, Graph exports or compliance exports.

To export: open the link, select Chat history, and download the archive. Inside the archive you will find `messages.json` file.

Place the export file at `src/data/sample_export.json`. The server auto-detects the export owner from the `userId` field at the root of the file.

A demo export file is included at `src/data/sample_export_demo.json` if you want to try the server without your own data.

## Getting started

```bash
git clone https://github.com/mmsfloor/msgraph-mock-server.git
cd msgraph-mock-server
npm install
```

Start with your real export:

```bash
npm start
```

Start with the included demo file:

```bash
DATA_FILE=./src/data/sample_export_demo.json npm start
```

On startup, the server verifies file integrity using SHA256 and message count:

```
--- DATA INTEGRITY VERIFIED ---
Total conversations: 137
Total messages: 50212
File hash (SHA256): 94e1e7d...
-------------------------------
Mock server running at http://localhost:3000
Graph endpoints available at http://localhost:3000/v1.0/
```

## Endpoints

### GET /v1.0/me/chats

Returns all chats. Members are derived from actual message authors rather than the raw export member list, which often contains unresolved entries.

```json
{
  "value": [
    {
      "id": "19:abc123...@thread.v2",
      "topic": "NexPath / VoltSMS",
      "createdDateTime": "2026-01-28T08:10:00.000Z",
      "chatType": "group",
      "lastMessagePreview": null,
      "members": [
        { "id": "8:live:.cid.bbb222ccc333ddd4", "displayName": "John Smith" }
      ]
    }
  ]
}
```

### GET /v1.0/me/chats/:chatId/messages

Query parameters:

| Parameter | Description |
|-----------|-------------|
| `$top` | Number of messages per page |
| `$skip` | Number of messages to skip |
| `$orderby` | `createdDateTime asc` (default) or `createdDateTime desc` |
| `debug` | Set to `true` to include `_mock_identity_type` in each message |

Example response:

```json
{
  "@odata.nextLink": "http://localhost:3000/v1.0/me/chats/{chatId}/messages?%24top=5&%24skip=5",
  "value": [
    {
      "id": "1738000200000",
      "chatId": "19:abc123...@thread.v2",
      "createdDateTime": "2026-01-28T08:15:00.000Z",
      "lastModifiedDateTime": "2026-01-28T08:15:00.000Z",
      "messageType": "RichText/Html",
      "direction": "INBOUND",
      "replyToId": null,
      "attachments": [],
      "from": {
        "user": {
          "id": "8:live:.cid.bbb222ccc333ddd4",
          "displayName": "John Smith",
          "userIdentityType": "aadUser"
        }
      },
      "body": {
        "contentType": "html",
        "content": "<p>BD OTP direct route available at 0.0085</p>"
      }
    }
  ]
}
```

### GET /v1.0/me/chats/:chatId/messages/delta

Returns all messages for a chat with `@odata.deltaLink`. Delta tokens in this mock are stateless — every call returns all messages regardless of the token. This differs from the real Graph API where delta tokens track incremental changes and expire after a period of inactivity.

### GET /v1.0/messages/delta

Returns all messages across all chats in a single response. Useful for initial full ingestion. The response can be large depending on the export file size.

## Mock-specific fields

These fields are returned by this server but do not exist in the real Microsoft Graph API. Code that relies on them will need adjustment when switching to production.

| Field | Description |
|-------|-------------|
| `direction` | `OUTBOUND` if the message was sent by the export owner, `INBOUND` if received, `null` if sender is unknown. Derived by comparing `msg.from` and `importedBy.RawValue` against the export `userId`. |
| `_mock_identity_type` | Debug field returned when `debug=true`. Values: `mri`, `display_only`, `no_identity`. |

## Identity resolution

Sender identity is resolved from each message in priority order:

1. `msg.from` or `properties.importedBy.RawValue` present — real MRI used as ID, `userIdentityType: aadUser`
2. Only `displayName` available — deterministic `display::sha256(displayName + chatId)` used as ID, `userIdentityType: externalUser`
3. Nothing available — message excluded from API response

Note: `display::sha256` identifiers are chat-scoped. The same display name in two different chats produces different IDs. These are mock identifiers and do not correspond to real Graph user IDs.

## Exclusion filters

Create `excludedChats.json` in the project root to hide specific chats from all API responses:

```json
{
  "excludeByTopic": ["Internal Team"],
  "excludeByContains": ["test_", "sandbox"],
  "excludeById": ["19:abc123@thread.v2"]
}
```

`excludeByContains` matches against both chat topic and chat ID. Excluded chats are completely invisible to the API.

## Known limitations

- Only read operations are supported
- Delta tokens are stateless — full dataset returned on every delta call
- `lastMessagePreview` is always null
- `attachments` contains AMS media object IDs, not full Graph attachment objects
- Identity resolution is heuristic — based on export fields, not real AAD lookups
- Members are derived from message authors, not from a live membership list
- Message IDs come from timestamps in the export and may not match real Graph message IDs

## Project structure

```
src/
├── data/
│   └── sample_export_demo.json   # Demo export file
├── filters/
│   └── chatFilter.js             # Chat exclusion logic
├── identity/
│   └── resolver.js               # MRI identity resolution
├── mappers/
│   └── graphMapper.js            # Maps internal model to Graph API format
├── normalization/
│   └── normalizer.js             # Message normalization pipeline
├── routes/
│   └── graphRoutes.js            # Route definitions
├── services/
│   ├── dataService.js            # Data loading and integrity check
│   └── queryProcessor.js        # Pagination and query handling
└── server.js                     # Entry point
```

## Tech stack

- Node.js
- Express
