# MINIMEE Child Profile Landing Page Specification

## Core purpose
A visual self-introduction / “My Room” landing page for a child, designed as an interactive digital scrapbook + notebook + childhood memory book.

## Visual direction
- warm cream notebook paper
- scrapbook / handmade paper layering
- sticker wall
- varied sticker sizes
- masking tape / tabs / pins
- subtle dotted or stitched connectors
- small MEE pets integrated into corners and empty spaces
- soft shadows
- asymmetrical but controlled layout
- mobile-first
- not a SaaS dashboard
- not a generic card grid
- not glassmorphism

## Existing project constraints
- Keep the existing MINIMEE architecture.
- Do not rebuild the site from scratch.
- Reuse existing routes, components, authentication and data models where possible.
- Existing static image assets are in GitHub.
- Existing videos use Supabase.
- User-uploaded child photos should reuse the existing application upload/storage flow after audit.
- Do not create a second unnecessary storage system.

## Parent-managed profile data
Basic profile data is entered/updated by the parent.

Each privacy-sensitive field must have its own independent:
**Public ↔ Private** switch.

Examples:
- birthday
- school
- other personal profile information

No single global visibility switch.

## Child-managed sticker data
The child may:
- add stickers
- remove stickers
- reorder stickers
- drag stickers
- change favourites
- select interests / daily activities / dream jobs

No parent approval is required for each sticker change.

## Save behaviour
### Parent profile edits
1. enter/update basic profile data
2. set Public / Private switch per field
3. optionally choose initial stickers
4. press Confirm
5. update immediately

### Child sticker edits
Use lightweight autosave or a small save interaction based on the existing architecture.

## Age logic
Do not store/display a permanently fixed age.
Calculate age from DOB and update automatically over time.

## Sticker rules
- Stickers may repeat across categories.
- Example: football may appear in both Daily Life and Interests.
- Stickers do not need individual privacy switches.
- Favourite/featured sticker: XL
- normal sticker: M
- secondary sticker: S

## Drag & reorder
Desktop:
- mouse drag-and-drop

Mobile:
- touch / long-press drag

Reuse an existing drag-and-drop dependency if present.

## Sticker detail interaction
Click/tap a sticker to open a scrapbook-style detail panel/popover.

Supported states:
1. sticker only
2. sticker + short sentence
3. sticker + uploaded photo
4. sticker + short sentence + uploaded photo

Text is optional.

## Photo upload warning
During edit/upload mode show:

> This photo will be visible to people who can view this profile. Please do not upload it if you do not want your child’s photo to be shown.

Do not show this warning to visitors.

User-uploaded photos must not be committed into GitHub as normal repository assets.

## Page structure

### 1. Hero / Child Introduction
Include:
- child avatar / hero image
- nickname
- dynamically calculated age
- optional short self-introduction
- representative MEE pet
- 2–4 featured stickers

Use scrapbook composition, not a generic rectangular profile card.

### 2. “This Is Me” Sticker Wall
Main visual identity area.

Use varied sticker sizes and controlled free composition.

### 3. Daily Life
Possible stickers:
- school
- tutoring
- homework
- reading
- TV
- YouTube
- gaming
- phone / tablet
- drawing
- crafts
- cooking
- chores
- caring for pets
- park
- cycling
- running
- swimming
- ball games
- dancing
- singing
- instruments
- library
- museum
- theme park
- travel
- camping
- beach
- hiking
- playing with friends
- birthday parties
- family gatherings

### 4. Interests
Possible stickers:
- dinosaurs
- animals
- insects
- ocean
- sharks
- space
- planets
- rockets
- robots
- cars
- trains
- airplanes
- ships
- magic
- princess
- hero
- ninja
- detective
- treasure
- adventure
- football
- basketball
- art
- music
- dance
- cooking
- science experiments
- history
- geography
- cultures
- languages
- fashion
- makeup / dress-up
- photography
- filmmaking
- coding

### 5. My Favourites
Visual-first:
- favourite animal
- favourite food
- favourite colour
- favourite place

### 6. My Dream
Career stickers:
- doctor
- nurse
- veterinarian
- teacher
- firefighter
- police officer
- pilot
- astronaut
- scientist
- engineer
- programmer
- architect
- chef
- pastry chef
- artist
- designer
- singer
- dancer
- actor
- YouTuber
- photographer
- director
- football player
- basketball player
- racing driver
- marine biologist
- archaeologist
- animal keeper
- farmer
- magician
- I don’t know yet

“I don’t know yet” should look playful and positive.

### 7. MEE Collection Preview
Show a small preview, e.g. 3 recent cards.
CTA: View all → MEE Album House

### 8. Hero Studio / Learning Preview
Small summary only:
- current topic
- recent progress
- completed activities

Keep this secondary to self-introduction.

### 9. Friends
Show a small set of friend icons / memory cards.
Do not style it as a followers list.

### 10. Child Quote / Memory
End with one memorable child quote styled like a handwritten scrapbook note.

## Sticker Picker
Categories:
- Daily
- Interests
- Food
- Dreams
- Animals
- Other

Requirements:
- large touch targets
- visual grid
- minimum text
- one-tap selection
- avoid dropdown-heavy UX
- avoid complex multi-step modals

## Decorative system
Use recurring visual details:
- paper tabs
- tape
- small pins
- stars
- hearts
- flowers
- stitched edges
- dotted paths
- notebook holes
- tiny MEE pets
- soft shadows
- slightly irregular paper edges

Decorations must not interfere with readability or tap targets.

## Dotted / stitched connectors
Use subtle hand-drawn dotted or stitched connectors between selected elements.

Examples:
- featured sticker → profile
- related stickers → category label
- decorative icon → section title

Do not make them look like flowchart arrows.

## Responsive behaviour
### Mobile
Primary target. One continuous vertical scrapbook.

### Desktop
Use a wider scrapbook spread / two-column composition where useful.
Do not simply stretch mobile cards across the full width.

## MEE character consistency
Use existing MEE pet assets.

Preserve:
- body proportions
- facial features
- eye style
- cape
- signature outfit
- main colour
- emblem
- characteristic accessories

## Implementation rule
The reference image defines:
- art direction
- hierarchy
- relative scale
- spacing
- density
- scrapbook language

It does NOT mean every object should use fixed absolute x/y positioning.

Build responsive reusable components.

## Suggested component structure
Adapt to project conventions:
- ChildProfileHero
- StickerWall
- StickerItem
- StickerPicker
- StickerDetailPopover
- DailyLifeSection
- InterestsSection
- FavouritesPanel
- DreamPanel
- MeeCollectionPreview
- LearningPreview
- FriendsPreview
- ChildQuote
- PrivacyFieldSwitch

## QA
Test:
- 375px mobile
- 430px mobile
- tablet
- 1440px desktop

Verify:
- no overlapping stickers
- no clipped labels
- mobile drag works
- desktop drag works
- no duplicate save operations
- uploaded photos preserve aspect ratio
- privacy switches behave correctly
- age calculation is correct
- child cannot modify parent-only basic fields
- MEE Album House links still work
- Hero Studio links still work
- page still feels like one coherent scrapbook rather than a dashboard
