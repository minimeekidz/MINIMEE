# MiniMee Art Routing Quick Reference

If the user says any of the following, load these files before generating:

- **「整/改 Gameplay 場景」** → Visual Direction Bible + Gameplay Art Lock + Scene Prompt Lock + relevant scene manifest.
- **「整 Day/Night/Weather variant」** → Gameplay Art Lock + scene manifest + Scene Prompt Lock.
- **「整 Entrance / Loading」** → Visual Direction Bible + Scene Prompt Lock + relevant entrance visual anchor; do not use it as geometry authority.
- **「整 Interaction UI / Zoom UI」** → Visual Direction Bible + Scene Prompt Lock + relevant UI anchor + global UI registry when screen-fixed controls are involved.
- **「改角色／寵物畫風」** → canonical character/pet Bible + relevant identity reference + Visual Direction Bible.
- **「我要參考某張圖生圖」** → classify the selected reference as identity/style/composition/UI/lighting/entrance/visual-only before generation.

Never skip the geometry manifest for official gameplay maps.
