# Player Seek and Episode Popup Focus Design

## Context

The custom video player already supports remote-control seeking with acceleration and a player-side episode list popup. Seeking is handled in `src/components/video-player/CustomVideoPlayer.jsx` through `startSeekAcceleration`, which currently advances the preview target every 150ms using 10s, 20s, then 40s steps after the user holds left or right. The episode popup is rendered by `EpisodeSidebar`, registers focusable items in zone 3, and closes on Backspace or Escape.

Two refinements are needed:

- Long remote seeks should become slightly faster without becoming hard to control.
- When the episode list popup is open, focus must stay inside the popup until the popup closes or the user presses Back/Escape on the remote.

## Goals

- Change long-hold remote seek acceleration to 10s, 25s, then 60s steps at the existing 1s and 2s thresholds.
- Keep the existing 150ms seek preview cadence and delayed commit-on-keyup behavior.
- Trap arrow focus inside the episode popup while it is open.
- Make Backspace/Escape close only the episode popup when the popup is open, without closing the whole player.
- Preserve current episode selection and close behavior after choosing an episode.

## Non-Goals

- No visual redesign of the player or episode popup.
- No global rewrite of `FocusContext` trap behavior.
- No changes to mouse/touch timeline seek behavior.
- No changes to autoplay or previous/next episode controls.

## Recommended Approach

Make a targeted update in `CustomVideoPlayer.jsx` because both behaviors are already coordinated there:

- Update `startSeekAcceleration` so the step schedule is `10` seconds while held under 1 second, `25` seconds from 1 to under 2 seconds, and `60` seconds after 2 seconds.
- Keep accumulated seeking preview-only until `keyup`, then commit the final target with the existing `seekToTime` flow so audio mute/resume behavior remains unchanged.
- When `sidebarOpen` is true, treat key events as modal-only player events:
  - Arrow keys call `preventDefault` and `stopPropagation`.
  - Focus candidates are limited to visible buttons inside `.episode-sidebar`.
  - `Enter` and Space only click if the active element is inside `.episode-sidebar`; otherwise focus moves back into the popup.
  - Backspace/Escape call `closeSidebar` and stop propagation so the player `onClose` handler is not invoked.

This keeps the change local to the player and avoids affecting other screens that use `FocusContext`.

## Focus Behavior

When the episode popup opens, `EpisodeSidebar` continues to focus the first episode item, falling back to the close button when no episode item exists. While open, arrow navigation must only consider visible popup buttons: the close button, accordion controls if present, and episode items. If focus is outside the popup due to browser timing or a previous control, the next arrow/OK interaction should bring focus back into the popup rather than acting on player controls behind it.

Backspace and Escape are modal close actions while the popup is open. After closing, normal player keyboard behavior resumes, including Backspace/Escape closing the player through `onClose`.

## Error Handling and Boundaries

- Seeking remains clamped between `0` and video duration.
- If duration is missing, acceleration does not start, matching current behavior.
- If no popup buttons are visible, arrow and OK events are swallowed while the popup is open to avoid activating background controls.
- The existing cleanup path still clears the seek interval on unmount, episode changes, and keyup.

## Testing

Add or update tests in `src/components/video-player/CustomVideoPlayer.test.jsx`:

- Verify holding ArrowRight long enough to pass the 1s and 2s thresholds uses the new 25s and 60s step sizes before committing on keyup.
- Verify arrow navigation while the episode dialog is open keeps focus among popup buttons and does not move focus to player controls.
- Verify Backspace while the dialog is open closes the dialog and does not call the player `onClose` callback.

Existing tests for basic episode dialog open/select/close and remote seek resume behavior should continue passing.

## Acceptance Criteria

- Remote long-hold seek advances faster using the approved 10s, 25s, 60s schedule.
- Releasing the held seek key commits the final preview target once.
- Opening the episode list prevents focus from moving to any player control outside the popup.
- Back/Escape closes the episode list first; only after it is closed can Back/Escape close the player.
- The relevant player test suite passes.
