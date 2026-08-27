# MiniMee Coordinate Policy

## One canonical world, adaptive presentation
MiniMee should not maintain three separate manually-authored world-coordinate maps for Mobile, iPad and Desktop.

### World-space coordinates — shared across all devices
Use for buildings, doors, paths, bridges, furniture interactions, diary books, NPC anchors, pet spawn anchors and portals. Store one canonical `tile_x/tile_y` or `world_x/world_y` set in the scene manifest.

### Screen/UI coordinates — device adaptive
Use for top HUD, Dock, modal controls, notification badges, activity/task/news/settings icons. Store normalized x/y (0..1), anchor, safe-area rules and minimum hitbox.

### Device profiles
Mobile 9:16, iPad/tablet and Desktop 16:9 remain useful for QA/camera framing, but are derived presentation specs—not independent world-coordinate sources of truth.

## Practical rule
If an object lives inside the game world, store one canonical world coordinate. If it is fixed to the screen, store a normalized UI coordinate + anchor + safe area.
