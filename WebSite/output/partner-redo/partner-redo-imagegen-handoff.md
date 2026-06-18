# Partner Presentation Image Redo - Image Generation Handoff

## Goal

Create 8 photorealistic website-ready presentation images:

- 4 FedSafe partners
- 2 variations per partner
- 2 presenter-on-left compositions
- 2 presenter-on-right compositions

The current session does not expose the built-in image generation tool, so this file is prepared for the next image-capable run.

## Output Folder

Save final images here:

```text
C:\WIP\FEDSafeRetirement\WebSite\New\assets\images\generated\partner-redo\
```

Recommended final size:

```text
2048x1229 or similar 5:3 landscape, matching the existing redo compositions.
```

## Reference Images

### Existing Redo Composition Targets

Use these as style/composition references, not identity references:

```text
C:\WIP\FEDSafeRetirement\WebSite\Assets\Redo\Ben.png
C:\WIP\FEDSafeRetirement\WebSite\Assets\Redo\Brian.png
C:\WIP\FEDSafeRetirement\WebSite\Assets\Redo\Dan.png
```

Observed dimensions:

```text
Ben.png   2746x1666
Brian.png 2729x1632
Dan.png   2780x1712
```

### Partner Identity References

Use these for face/identity only:

```text
G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Assets\Partners\Ben_Bailey_GrayBG.webp
G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Assets\Partners\Brian_Westrich_GrayBG.webp
G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Assets\Partners\Daniel_French_GrayBG.webp
G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Assets\Partners\Mike_Zaino_GaryBG.webp
```

Observed dimensions: each is `600x800`.

### Logo Reference

Use the FedSafe shield logo exactly as a proportional shirt patch on the left breast/pocket area:

```text
C:\WIP\FEDSafeRetirement\WebSite\New\assets\logos\Fedsafe-Logo-Only_aHR0cHM6_533x599.webp
```

Do not alter logo colors, shape, proportions, or wording. Keep it small, realistic, embroidered/patch-like, and placed on the presenter's left breast.

## Global Image Requirements

Use case: `identity-preserve`

For every generated image:

- Photorealistic federal retirement education/workshop scene.
- Presenter must be facing the people/audience, never facing the camera directly.
- Retain the partner's recognizable facial identity, general expression, and hand gesture style from the references.
- Light shirt color only:
  - White
  - Light blue
  - Pale blue-gray
  - Soft medium blue
- Shirt should be casual/professional polo or button-down, not a suit jacket.
- FedSafe shield logo on left breast pocket area, proportional and unaltered.
- Audience must be diverse:
  - Mixed women and men
  - Ethnically diverse
  - Ages roughly 45-65
  - Casual office/training attire
  - No formal dresses, no suits, no luxury/corporate boardroom look.
- Training room or workshop setting:
  - chairs, tables, notebooks, handouts, soft projection screen or whiteboard.
  - calm, educational, trustworthy, natural lighting.
- No readable fake text except clean abstract charts/shapes on presentation screen.
- No watermarks.
- No distorted hands, extra fingers, warped faces, fake logos, or camera-facing presenter.

## Filename Plan

```text
ben-bailey-presentation-left-v1.webp
ben-bailey-presentation-right-v2.webp
brian-westrich-presentation-left-v1.webp
brian-westrich-presentation-right-v2.webp
daniel-french-presentation-left-v1.webp
daniel-french-presentation-right-v2.webp
mike-zaino-presentation-left-v1.webp
mike-zaino-presentation-right-v2.webp
```

If the final image generator produces PNG/JPG first, save the original, then export optimized WebP siblings for the website.

## Prompt Template

Use this template for each image, changing the partner, shirt color, and side.

```text
Use case: identity-preserve
Asset type: FedSafe website partner presentation photo
Primary request: Create a photorealistic workshop/training photo of [PARTNER NAME] presenting to federal/postal employees in a small education session.
Input images:
- Redo composition reference: use the existing redo image only for room composition, audience perspective, and presentation-session feel.
- Partner portrait reference: use only for identity, age, facial structure, hair, expression, and overall presence.
- FedSafe shield logo reference: place as an accurate embroidered patch on the presenter's left breast pocket area.
Scene/backdrop: modest training room, tables, chairs, handouts, notes, and a soft presentation screen or whiteboard in the background.
Subject: [PARTNER NAME] wearing a [SHIRT COLOR] professional casual shirt with the FedSafe shield logo patch on the left breast. Presenter is mid-explanation, using a natural hand gesture, turned toward the audience, not looking into the camera.
Audience: mixed men and women, ethnically diverse, ages 45-65, casual office attire, attentive and realistic. Avoid suits, formal dresses, fashion-model styling, or young tech-startup audience.
Style/medium: photorealistic editorial website photography, natural lens perspective, realistic skin, realistic hands, believable room lighting.
Composition/framing: wide 5:3 landscape. Presenter on the [LEFT/RIGHT] side of the image. Audience visible in foreground and midground. Leave enough visual context so it feels like education, not a staged headshot.
Lighting/mood: bright but soft indoor lighting, clear and professional, not dark, not dramatic, not over-washed.
Constraints:
- Keep the presenter's identity recognizable.
- Presenter must face the audience/people, never the camera.
- Preserve a calm educational expression and natural hand gesture.
- FedSafe shield logo must remain accurate, proportional, and on left breast.
- No fake readable text, no watermark, no extra logos, no distorted hands, no formal suits.
Avoid: camera-facing portrait, oversized headshot, dark room, harsh spotlight, blurry audience, luxury boardroom, formal gowns, suit jackets, wrong logo colors.
```

## Individual Prompts

### 1. Ben Bailey - Left - White Shirt

Use:

```text
[PARTNER NAME] = Ben Bailey
[SHIRT COLOR] = white or very light cool-white polo shirt
[LEFT/RIGHT] = left
Redo composition reference = C:\WIP\FEDSafeRetirement\WebSite\Assets\Redo\Ben.png
Partner portrait reference = G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Assets\Partners\Ben_Bailey_GrayBG.webp
Output = ben-bailey-presentation-left-v1.webp
```

### 2. Ben Bailey - Right - Light Blue Shirt

```text
[PARTNER NAME] = Ben Bailey
[SHIRT COLOR] = light blue button-down shirt
[LEFT/RIGHT] = right
Redo composition reference = C:\WIP\FEDSafeRetirement\WebSite\Assets\Redo\Ben.png
Partner portrait reference = G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Assets\Partners\Ben_Bailey_GrayBG.webp
Output = ben-bailey-presentation-right-v2.webp
```

### 3. Brian Westrich - Left - Pale Blue-Gray Shirt

```text
[PARTNER NAME] = Brian Westrich
[SHIRT COLOR] = pale blue-gray polo shirt
[LEFT/RIGHT] = left
Redo composition reference = C:\WIP\FEDSafeRetirement\WebSite\Assets\Redo\Brian.png
Partner portrait reference = G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Assets\Partners\Brian_Westrich_GrayBG.webp
Output = brian-westrich-presentation-left-v1.webp
```

### 4. Brian Westrich - Right - White Shirt

```text
[PARTNER NAME] = Brian Westrich
[SHIRT COLOR] = clean white professional casual button-down shirt
[LEFT/RIGHT] = right
Redo composition reference = C:\WIP\FEDSafeRetirement\WebSite\Assets\Redo\Brian.png
Partner portrait reference = G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Assets\Partners\Brian_Westrich_GrayBG.webp
Output = brian-westrich-presentation-right-v2.webp
```

### 5. Daniel French - Left - Soft Medium Blue Shirt

```text
[PARTNER NAME] = Daniel French
[SHIRT COLOR] = soft medium blue button-down shirt
[LEFT/RIGHT] = left
Redo composition reference = C:\WIP\FEDSafeRetirement\WebSite\Assets\Redo\Dan.png
Partner portrait reference = G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Assets\Partners\Daniel_French_GrayBG.webp
Output = daniel-french-presentation-left-v1.webp
```

### 6. Daniel French - Right - Light Blue Shirt

```text
[PARTNER NAME] = Daniel French
[SHIRT COLOR] = light blue polo shirt
[LEFT/RIGHT] = right
Redo composition reference = C:\WIP\FEDSafeRetirement\WebSite\Assets\Redo\Dan.png
Partner portrait reference = G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Assets\Partners\Daniel_French_GrayBG.webp
Output = daniel-french-presentation-right-v2.webp
```

### 7. Mike Zaino - Left - White Shirt

There is no Mike redo target in `Assets\Redo`, so use the Daniel room reference for presentation scale/composition unless a Mike-specific redo image is added.

```text
[PARTNER NAME] = Mike Zaino
[SHIRT COLOR] = white professional casual shirt
[LEFT/RIGHT] = left
Redo composition reference = C:\WIP\FEDSafeRetirement\WebSite\Assets\Redo\Dan.png
Partner portrait reference = G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Assets\Partners\Mike_Zaino_GaryBG.webp
Output = mike-zaino-presentation-left-v1.webp
```

### 8. Mike Zaino - Right - Pale Blue Shirt

```text
[PARTNER NAME] = Mike Zaino
[SHIRT COLOR] = pale light-blue button-down shirt
[LEFT/RIGHT] = right
Redo composition reference = C:\WIP\FEDSafeRetirement\WebSite\Assets\Redo\Brian.png
Partner portrait reference = G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Assets\Partners\Mike_Zaino_GaryBG.webp
Output = mike-zaino-presentation-right-v2.webp
```

## Validation Checklist

For every output:

- [ ] Partner is recognizable.
- [ ] Presenter is facing the audience, not the camera.
- [ ] Shirt is light color.
- [ ] FedSafe shield logo is on left breast and not distorted.
- [ ] Audience includes mixed gender, ethnicity, and age 45-65.
- [ ] Audience clothing is casual/professional, not formal.
- [ ] Hands and faces look realistic.
- [ ] No fake readable text or watermarks.
- [ ] Composition side matches filename.
- [ ] Exported to final project folder.

