# Crow 前端重設計 — 社群網站 × 爭奪網格

**日期**：2026-06-06
**範圍**：純前端重設計（不動後端、不做手機 RWD）
**目標**：把目前「深色終端 + 像素爭奪網格」的 Crow，重設計成「明亮溫暖的創作者社群網站」，並把爭奪網格**深度融合**為社群的視覺化核心（逛網格 = 逛社群）。設計語言參照 `stitch_remix_of_ai_creator_feed/`（BuildLog）。

---

## 1. 設計系統（全站共用地基）

### 色彩（採用 BuildLog token）
- 底色：奶油白 `#fcf8f9`；卡片：純白 `#ffffff` + 1px 邊框 `#e5e1da` + 淡散陰影（寬 spread、低 opacity）
- 主色：深橘 `#ac3509`（按鈕 / CTA / 品牌）；亮橘珊瑚 `#ff7043`（hover / highlight）
- 副色：薄荷綠 `#006a63`（代表 alive / 成長 / 完成，對應網格生命機制）
- 文字：深炭灰 `#1b1b1c`；次要文字 `#59413a`
- 狀態：error 紅；dying = 褪色橘；fossil = 淺灰

### 字體
- 主字體 **Inter**：標題重字重 + 緊字距，內文寬行高（取代現有像素字體）
- **像素字體保留為點綴**：僅用於網格相關數字/標籤（momentum 值、territory cells、credits ₵、倒數計時），呼應像素烏鴉

### 形狀
- 卡片 / 輸入框 16px 圓角；chip 藥丸狀
- **例外：網格 cell 維持方正、`image-rendering: pixelated`、不圓角**（選項 2 的「數位野性」）

### 版面
- 1280px 置中、桌機 40px 邊距、8px 間距節奏

### 圖示
- **不使用 emoji**。改用 icon 套件 `lucide-react`（線性風格，搭暖色社群）

### 技術地基
- 引入 `react-router`，建立路由：`/`（首頁網格）、`/p/:id`（專案頁）、`/submit`、`/u/:handle`（個人檔）、`/share/:id`（分享卡）
- 現有 `App.tsx` 手動 `pathname` 判斷（僅 `/auth/callback`）改由 router 管理；`/auth/callback` 維持
- react-query / 現有 API client 全部沿用
- 動畫：引入 Framer Motion（`motion`）
- 維持 ≤820px 的桌機限定守門頁（不做手機 RWD）

### 網格明亮化（選項 2）
- canvas 底色改奶油色系；cell 用專案彩色方塊（保持像素銳利）
- dying = 顏色褪色 + 半透明；fossil = 淺灰方塊
- code rain 拿掉或極淡化

---

## 2. 烏鴉吉祥物 `<CrowMascot>`

- 獨立、覆蓋全頁元件（`position: fixed`，`pointer-events` 僅在烏鴉本體）；用現有像素烏鴉 PNG，`image-rendering: pixelated`
- **動畫素材策略**：先用一張靜態 PNG，靠 transform 做出個性（不需額外素材）。保留之後補 4–6 幀 sprite 做拍翅/眨眼的擴充空間（介面不變）
- **狀態機**：`idle`（bob / 歪頭）、`walk`（沿邊緣移動、scaleX 翻轉面向）、`hop`（拋物線跳躍 + 落地 squash/stretch，活著感主力）、`peck`（點頭）、`startle`（滑鼠靠近受驚跳開）
- **行為**：平時在角落/邊緣漫步、隨機跳落點；閒置久了做小動作；滑鼠靠近閃避
- **克制原則**：低頻率、貼邊、不擋內容、不蓋可點區
- **無障礙**：尊重 `prefers-reduced-motion`（關閉動畫則靜態站立）

### 套件選擇：Framer Motion
- `useAnimationControls` 做跳躍/漫步指令式序列；spring 物理做自然落地
- 內建 squash/stretch、彈簧回彈
- gesture / pointer 做閃避
- 一個 `<CrowMascot>` 元件 + state machine 管狀態
- （替代方案 GSAP 在路徑動畫更強但較重；純 CSS 寫閃避邏輯痛苦，皆不採用）

---

## 3. 導覽 + 5 個頁面

### 全站 header（共用）
- 左：像素烏鴉 logo + `crow.gg / Digital Darwinism`
- 中：`Grid`（首頁）、`Explore`
- 右：`₵ credits`、`Submit Project`（深橘 CTA）、使用者頭像
- 風格：奶油底、橘色 active 底線

### ① 首頁 `/` — 爭奪網格（英雄）+ 活動時報
- 主舞台：明亮重繪 60×60 像素網格 canvas；hover cell → 專案社群卡（重設計 HoverCard 成奶油風）；點 cell → 專案頁
- 右側欄三塊：
  - `Trending`：momentum 衝最快的專案
  - `Top Builders`：領地最大的玩家
  - `Live Activity`：活動時報（誰 submit / 被 boost / dying / 復活）
- 登入後顯示自己的專案狀態卡（momentum bar、倒數、領地數；重設計 ProjectPanel）

### ② 專案頁 `/p/:id`（BuildLog detail 風）
- 大標題 + 描述故事
- 數據列（像素字體點綴）：壽命 / momentum / 領地 cells / status
- 技術棧 chip（薄荷綠 / 珊瑚 藥丸）
- 作者卡（頭像 + handle + Follow*）
- 主行動：Boost / Click（interact API）；dead → Resurrect（resurrect API）
- 「More like this」相關專案

### ③ Submit `/submit`（分段表單）
- Core Identity（name、一句話描述、demo URL、repo URL）→ Visual（截圖上傳*）→ Build Process（tech stack chip 輸入、project story）
- 送出 = 佔網格一塊地（createProject API）

### ④ 個人檔 `/u/:handle`
- 頭像 + handle + bio*；數據：總領地、活著專案數、`₵ credits`、復活次數
- 我的專案列表 + fossil 墓園（死掉的專案）

### ⑤ 分享成就卡 `/share/:id`
- 可下載成就卡預覽（專案名、tech chip、壽命、領地）+ 客製選項（背景、版型、顯示開關）+ 下載 / 複製連結
- 純前端產圖（canvas / html-to-image），不需後端

---

## 4. 資料策略

原則：現有 API 能拿到的接真資料；後端沒有的優雅降級或暫時 mock，**絕不假裝成功**，缺的 endpoint 標 `TODO`。

### 用現有 API（真資料）
- 網格快照（grid poll）、cell → 專案
- 專案資料：name / description / url / tech_tags / status / momentum / territory_size / expires_at / color
- 互動：click / boost / resurrect
- 我的專案：createProject / abandonProject / useMyProject
- 我自己的帳號：Me（handle / avatar / credits / resurrection_count）

### 後端目前沒有 → 處理方式
- **Trending / Top Builders**：由 grid 快照 + 專案資料前端排序算出 → 真資料，不需 mock
- **Live Activity 時報**：無 endpoint → 先從 grid 快照前後差異「推導」基本動態（新增 / dying / 消失 cell）；不足處放少量**明確標示**的示意 mock，標 `TODO: activity endpoint`
- **別人的個人檔 `/u/:handle`**：自己的用 `Me` 接真資料；無「依 handle 查他人」endpoint 時降級（或暫時只開放看自己），標 `TODO`
- **Follow 創作者**：無 endpoint → UI 做出但 disabled / 標 `TODO`
- **截圖上傳（Submit Visual）**：無上傳 endpoint → UI 做出但 disabled / 標 `TODO`
- **分享卡下載**：純前端產圖，可做真功能

---

## 待補後端 endpoint（本次不做，標記供未來）
- Activity feed
- 依 handle 查他人 profile
- Follow / unfollow
- 截圖上傳
