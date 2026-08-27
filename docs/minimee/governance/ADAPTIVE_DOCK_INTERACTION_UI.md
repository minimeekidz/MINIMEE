# MiniMee Adaptive Collapsible Dock & Interaction UI

## Principle
The Dock is not a generic RPG navbar. It contains only portable, frequently useful functions.

## Recommended Dock
- 名片
- 小寵物
- 好友冊
- 背包
- 更多

## More
- 設定
- 家長模式
- 遺失模式
- 幫助 / FAQ

## World-owned functions
Normally not Dock buttons: Mee珍藏館 content, Mee電影院 content, Mee工作學習總部 functions and location-specific activities.

## Behaviour
- collapsed by default
- tap or swipe up to open
- overlay gameplay; do not resize/zoom camera
- tap outside / swipe down to close
- minimum effective hitbox 44pt; prefer 48–56pt for children
- QA floor: 360 CSS px width; iPhone 6 logical viewport is a key minimum reference

## Pixel UI implementation
Use reusable pixel-art skins / 9-slice components. Program controls layout/hitbox; art controls visual skin.

## Pet Compendium
Scrollable list of the 12 canonical pets with portrait, canonical name, affinity, discovery state, personality, preferences, common locations and canonical Bible fields. Locked information displays `???` until affinity/discovery conditions are met. Undiscovered pets may be silhouette + `???`. The compendium must not teleport pets to the player.
