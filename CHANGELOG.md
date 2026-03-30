# Changelog — Mailflow AI

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-03-30

### Added
- IMAP email reading (list, read, filter by sender/subject/date)
- SMTP email sending with HTML support and attachments
- Reply and forward with thread preservation
- Email management (delete, archive, move, mark read/unread)
- REST API with 16 endpoints on Express
- Self-documenting API (`GET /help` + `_help` field in every response)
- CLI with full command set (list, read, send, reply, forward, delete, archive, mark, move)
- Customizable HTML email signature
- Action history tracking (last 50 actions, filterable)
- Dry-run mode enabled by default for safety
- Sent email logging (`logs/sent.json`)
- Cron script for periodic email checking with webhook notifications
- Mailbox listing support
