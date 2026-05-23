# Story — demo-video-shoot-edit

**Epic:** Epic 5
**Depends on:** `story-vercel-production-deploy`, `story-canonical-60s-recording`
**Estimated:** 0.75 day
**Story slug:** `story-demo-video-shoot-edit`

## Goal

Shoot, edit, and host the canonical demo video. Structure: 30s human freelance flow → 60s bot-to-bot flow → 30s recap. Total ≤ 2:30. Uploaded to YouTube (unlisted) or Loom. Link committed to README.

## Acceptance criteria (BDD)

```
Given the storyboard from ux-spec §5 + PRD §5
When the video is shot
Then it follows the 30s/60s/30s structure exactly
And total length is between 1:50 and 2:30
And the visual quality is 1080p ≥ 30fps

Given the human freelance segment (0-30s)
When viewed
Then it shows: posting a $5 typo-fix job → submitting a corrected URL → ReasoningTrace populates → "RELEASED" verdict → claim payout
And every on-chain state change is visible on screen
And there is a brief on-screen caption naming the action ("Posting job…", "Submitting delivery…", "Judging…", "Released")

Given the bot segment (30-90s)
When viewed
Then it shows: clicking "Run live demo" (or playback) on /bots → 6+ bot jobs flowing past → TraceTimeline pulsing → "RELEASED" verdicts streaming → summary strip updating
And on-screen caption explains: "No human input from here on. Agents transacting."

Given the recap segment (90-120s)
When viewed
Then it shows: a frozen on-chain reasoning trail on the explorer + a screenshot of the 3 base agents composed in one tx + a 1-line "What this unlocks: long-tail micro-jobs, agent-to-agent commerce, on-chain reasoning"

Given the upload
When complete
Then the link is unlisted (not public, not searchable) but viewable by anyone with the URL
And the link is added to README.md

Given the video file
When archived
Then a local copy is saved to `docs/demo-video.mp4` (gitignored) for backup
And the storyboard is committed at `docs/demo-storyboard.md` for future reference
```

## File modification map

- `docs/demo-storyboard.md` — NEW — frame-by-frame storyboard
- `.gitignore` — UPDATE — exclude `docs/demo-video.mp4`
- README placeholder — UPDATE — embed the video link (final README in next story)

## Shell verification

```bash
# Video link is accessible
curl -s -o /dev/null -w "%{http_code}" "$DEMO_VIDEO_URL"   # 200

# Storyboard exists
test -f docs/demo-storyboard.md
grep -c "0:30\|1:30\|2:00" docs/demo-storyboard.md   # ≥ 3 timestamps

# Local backup file exists (gitignored)
test -f docs/demo-video.mp4
```

## Out of scope

- ❌ Music / narration (no voiceover in v1; on-screen captions are enough)
- ❌ Subtitles in multiple languages
- ❌ Multiple cuts for different platforms (one canonical cut only)
