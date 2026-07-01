# CanCan 3D 히어로 이미지 프롬프트

> GPT(이미지)·Midjourney 등에 붙여넣어 쓰세요.
> **핵심 원칙 3가지**
> 1. **글자는 빼고 생성** — AI가 "CANCAN" 글자를 거의 항상 뭉갬. 로고/문구는 코드로 얹는 게 깔끔.
> 2. **배경은 단색 or 투명** — UI에 얹을 거라 복잡한 배경 금지. "solid pale mint background" 또는 "transparent background(PNG)" 지정.
> 3. **브랜드 컬러 고정** — **Toss blue `#3182f6` (메인)** + mint `#08b5a0` (그라데이션 액센트만).

---

## 1) 로그인 히어로 — "캔 뽑기 자판기"

**용도:** 로그인 화면 상단 히어로. 밝고 초대하는 느낌.

```
A cute 3D rendered claw machine (crane game) filled with glossy soda cans,
soft studio lighting, playful and clean product-render style.
The machine body is Toss blue (#3182f6) with subtle mint-teal (#08b5a0) gradient accents.
The cans inside are glossy blue aluminum soda cans, neatly piled.
A shiny chrome claw hangs from the top.
Rounded, chunky, toy-like proportions. Smooth matte-plastic surfaces with soft highlights.
Solid pale mint background (#eff6ff), centered composition, generous empty space around the machine.
No text, no logo, no letters anywhere.
High detail, octane render, soft shadows, 3:4 portrait.
```

**변형(캔 클로즈업 버전):**
```
A single glossy blue aluminum soda can floating, 3D product render,
soft studio lighting, water-drop condensation, chrome pull-tab,
solid pale mint background (#eff6ff), lots of negative space, no text, no logo, 1:1.
```

---

## 2) 확정 완료 히어로 — "캔을 뽑았다 / 성공"

**용도:** 회의 시간 확정 완료 화면. 축하·성취의 순간.

```
A cute 3D rendered crane-game claw gently holding one glossy blue soda can,
lifting it up in triumph, confetti or sparkles softly around it,
playful clean product-render style, soft studio lighting.
Toss blue (#3182f6) main with mint (#08b5a0) accents, glossy chrome claw.
Rounded toy-like proportions, smooth surfaces, soft highlights and shadows.
Solid pale mint background (#eff6ff), centered, generous empty space.
No text, no logo, no letters. High detail, octane render, 3:4 portrait.
```

**변형(자판기에서 캔이 나오는 순간):**
```
A 3D rendered Toss-blue vending machine dispensing one glossy blue soda can into the tray,
the can catching soft light, celebratory mood, clean product-render style,
Toss blue (#3182f6) main + mint (#08b5a0) accent, solid pale mint background,
no text, no logo, soft shadows, 3:4 portrait.
```

---

## 3) 자판기 프론트뷰 (대시보드 상태 패널용)

> ⚠️ 지금 자판기는 **실시간 상태**(누가 응답했는지 캔으로 표시)라 정적 이미지로 100% 대체하면 기능이 죽어요.
> 그래서 **A(완성형·장식용)** / **B(빈 껍데기·기능 유지)** 두 버전.

### A. 캔이 꽉 찬 완성형 (정적 장식/소개용)
```
Front view of a cute 3D rendered vending / claw machine, straight-on symmetrical elevation,
filled with glossy blue soda cans behind a clean glass window.
Toss blue (#3182f6) body with mint (#08b5a0) gradient accents, chrome details,
rounded chunky toy-like proportions, smooth matte-plastic surfaces, soft studio lighting.
Solid pale mint background (#eff6ff), centered, symmetrical, generous margin.
No text, no logo, no letters. High detail, octane render, soft shadows, 4:5.
```

### B. 빈 껍데기 (유리창 비움 → 코드로 실시간 캔 얹기, 하이브리드)
```
Front view of a cute 3D rendered vending machine, perfectly straight-on symmetrical elevation,
the glass display window is EMPTY (no products inside), clean and clear,
Toss blue (#3182f6) body with mint (#08b5a0) accents and chrome trim,
rounded chunky toy-like proportions, soft studio lighting,
solid pale mint background (#eff6ff), centered and symmetrical, flat orthographic look.
No text, no logo, no letters, empty interior. octane render, soft shadows, 4:5.
```
**B 활용법:** 유리창 안이 비어 있어야, 그 사각 영역에 맞춰 실시간 캔(현재 SVG)을 `position:absolute`로 얹을 수 있어요. 정면·대칭·플랫(orthographic)일수록 얹기 쉬움. 3~4장 뽑아서 창이 반듯한 컷 고르기. 배치·정렬은 제가 코드로 맞춰드림.

---

## 4) 캔 단품 (자판기 속 실시간 캔 교체용)

> ⚠️ 캔에는 참여자 이니셜(지·민…)이 들어가는데 사람마다 바뀜.
> → **라벨을 비운 캔**을 뽑고, 이니셜 글자는 **코드로 캔 위에 얹기**. 상태(응답완료/대기) 2종 필요.

### A. 응답 완료 캔 (기본·블루)
```
A single glossy blue aluminum soda can, front view, straight-on, standing upright,
clean blank label (no text, no graphics on the can),
smooth glossy surface with soft highlight, chrome pull-tab on top,
rounded chunky toy-like proportions, soft studio lighting,
transparent background (PNG), centered, no shadow baked in.
No text, no logo, no letters anywhere. octane render, 1:1.
```

### B. 미응답(대기) 캔 (흐린·회색)
```
A single matte light-grey aluminum soda can, front view, straight-on, standing upright,
clean blank label (no text), slightly desaturated and faded look (empty/inactive),
soft studio lighting, transparent background (PNG), centered.
No text, no logo, no letters. octane render, 1:1.
```

**활용법**
- **정면·수직·투명배경**이 핵심 (여러 캔을 일렬로 타일링하고 그 위에 이니셜을 얹어야 해서).
- 그림자는 캔에 굽지 말고(baked-in 금지) 코드에서 `drop-shadow`로 넣는 게 정렬에 유리.
- 이니셜은 `position:absolute`로 캔 중앙에 흰 볼드 텍스트. 제가 맞춰드림.
- A(민트)·B(회색) 각각 3장씩 뽑아 제일 반듯한 컷 고르기.

---

## 빈 화면(선택) — "텅 빈 자판기"

**용도:** 회의 목록이 비었을 때(첫 방문).
```
A cute 3D rendered empty Toss-blue claw machine, glass box empty and inviting,
soft studio lighting, playful clean product-render style,
Toss blue (#3182f6) main + mint (#08b5a0) accent, solid pale mint background,
no text, no logo, soft shadows, 1:1 square.
```

---

## 5) 이미 만든 민트 이미지 → 토스 블루 리컬러 (편집 프롬프트)

> 새로 뽑지 말고 **기존 이미지를 편집**할 때. GPT 이미지 편집/인페인트에 **원본 + 아래 문구**를 함께 넣으세요.
> 원칙: **구도·형태·조명·질감은 100% 유지, 색만 교체.** 청록+코발트(=배민 느낌)를 → 토스 블루 메인 + 민트 액센트로.

### 공통 리컬러 지시 (아무 이미지에나)
```
Keep the exact same composition, shapes, proportions, lighting, reflections, and render style.
Only change the colors:
- Recolor all the teal/mint parts to Toss blue (#3182f6).
- Recolor the cans to glossy Toss-blue aluminum cans.
- Change the cobalt-blue accent parts (base, joystick, buttons, cord) to soft mint-teal (#08b5a0) or chrome silver.
- Change the background to a solid pale blue (#eff6ff).
Do not change anything else. No text, no logo.
```

### ① 캔 가득 찬 자판기 (로그인용)
```
Recolor this claw machine image. Keep composition, shapes, glass, claw, lighting and style identical.
Make the machine body Toss blue (#3182f6), the cans inside glossy blue,
and turn the previous cobalt-blue trim/base into soft mint-teal (#08b5a0) accents.
Background solid pale blue (#eff6ff). Nothing else changes. No text.
```

### ② 집게가 캔 집은 컷 (확정용)
```
Recolor this image. Keep the claw, the can shape, sparkles, lighting and style exactly the same.
Make the held can glossy Toss blue (#3182f6), keep the claw chrome silver,
recolor the blue coiled cord to soft mint-teal (#08b5a0).
Background solid pale blue (#eff6ff). Nothing else changes. No text.
```

### ③ 빈 자판기 정면 (대시보드 프레임용)
```
Recolor this empty vending machine. Keep the exact front-on composition, glass window, claw, shapes and lighting.
Make the body Toss blue (#3182f6), turn the cobalt-blue trim/base/joystick into soft mint-teal (#08b5a0) accents,
keep the glass window empty and clear. Background solid pale blue (#eff6ff). Nothing else changes. No text.
```

> 팁: 편집이 애매하게 나오면 "**only change hue, keep everything else pixel-identical**"를 덧붙이거나, 안 되면 4)·1)·3) 생성 프롬프트로 새로 뽑는 게 더 깔끔할 때도 있어요.

---

## 뽑은 뒤 적용법 (개발자 노트)

1. **투명 배경으로 뽑으면 최고** — 프롬프트에 `transparent background, PNG` 추가하거나, 단색 민트로 뽑아서 그대로 써도 됨(배경색을 `#eff6ff`로 통일).
2. 파일을 `cancan/public/` 에 넣기 (예: `hero-login.png`, `hero-confirm.png`).
3. 코드에서 `<img src="/hero-login.png" />` 로 사용. 로고·문구(CANCAN, "모두의 시간을…")는 **이미지 위에 텍스트로** 얹기.
4. 권장 크기: 가로 1024px 이상, 용량 최적화(TinyPNG 등).
5. 여러 장 뽑아서 가장 깔끔한 1장 고르기 — 손·클로 디테일이 어색한 컷이 종종 나옴.

> 준비되면 이미지 파일 주세요. 로그인/확정 화면에 얹고 텍스트 오버레이까지 맞춰드릴게요.
