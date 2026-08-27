# MiniMee Gameplay Art Lock

## Purpose
Separate canonical Geometry Master from final illustrated art so future agents can improve beauty without breaking gameplay.

## Geometry Master is source of truth for
- scene/building footprint
- roads and walkable space
- doors, entrances, exits and portals
- collision
- interaction zones
- NPC anchors
- shelter zones
- water/bridge/obstacle relationships
- world object IDs and coordinates

Geometry authority comes from the Scene System, the affected `scene.manifest.yaml`, and the global UI registry—not from a pretty reference image.

## Final Art Render may improve
- architecture style and materials
- flowers/foliage/decorative density
- signage and props
- lighting, sky, glow and weather FX
- atmosphere and storytelling

It may NOT change route connectivity, door placement, collision, route width contracts, portal ownership or geometry alignment across variants.

## Visual-only references
16:9 entrance scenes, splash images, UI panels and attractive prototypes are visual/style anchors only unless explicitly marked otherwise. If a reference has beautiful composition but incorrect routes, preserve its mood/palette/craft level and discard its route mistakes.

## Day / Night / Weather lock
CLEAR DAY, CLEAR NIGHT, CLOUDY, RAIN, THUNDERSTORM and FESTIVAL LIGHT reuse identical canonical geometry: same buildings, routes, entrances, doors, bridges, interaction anchors and collision. Only lighting, wetness, atmospheric FX, umbrellas/canopies and approved event decoration layers may change.

## Interior gameplay
Interior gameplay uses the same overall high-angle top-down gameplay camera family as exterior gameplay so one sprite language works through the whole game.

## Device coordinate rule
Do not maintain three independent world-coordinate maps for Desktop/iPad/Mobile. World objects use one canonical world/tile coordinate set. Screen-fixed HUD/Dock uses normalized coordinates, anchors and safe areas; device profiles are derived presentation/QA layouts only.

## Required scene delivery
1. Day Geometry Master
2. Day final art render
3. Scene manifest / Object IDs / coordinates locked
4. Night variant derived from same geometry
5. Weather/Festival variants only after geometry approval
