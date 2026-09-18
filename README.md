# 全台大專院校最新三年（113-115學年度）學測錄取成績與科系標準資料庫網頁

收錄全台灣 **123 所公私立大專院校**、**2,072 個校系** 最新三年（113、114、115 學年度）學測個人申請之**檢定標準**、**篩選倍率**、**第一階段最低通過與超額篩選級分**與**招生名額**，並提供多維度條件篩選、智能落點分析、個人申請 6 志願橫向比對與 CSV 匯出之完整資料庫網頁系統。

---

## 🌟 核心特色

1. **完整資料庫**
   - 包含台大、清大、交大、成大、政大等所有頂尖國立大學。
   - 包含中字輩、師範校院、醫學大學（北醫、高醫、中國醫、中山醫、長庚等）。
   - 包含所有私立名校（輔仁、東吳、淡江、逢甲、中原、東海、元智等）。
   - 包含辦理學測申請之科技大學學士班（台科大、北科大、雲科大等）。
   - 100% 對齊官方「18 大學群」分類體系。

2. **多樣性條件篩選引擎**
   - **關鍵字即時搜尋**：校名、學系、代碼毫秒級模糊搜尋。
   - **學校體系**：國立大學、私立大學、國立科大、私立科大。
   - **地理區域**：北部、中部、南部、東部、離島。
   - **18 大學群領域**：多選標籤切換（資訊、工程、醫藥衛生、商管、法政、文史哲等）。
   - **考科組合篩選**：勾選國、英、數A、數B、社、自，支援「任一採計」或「全部採計」。
   - **檢定標準限制**：可限制均標、前標以內門檻。
   - **預估基準級分滑桿**：自由設定目標分數區間。

3. **學測落點分析與適配器 (Score Matcher)**
   - 考生輸入個人 6 科學測級分與英聽等級。
   - 系統即時核算檢定標準，並依據歷史門檻將志願劃分為：
     - 🔥 **夢幻志願 (Dream)**：建議衝刺挑戰（差 1~2 級分）
     - 🎯 **落點志願 (Target)**：實力適配（錄取機會最高）
     - 🛡️ **保底志願 (Safe)**：穩操勝券（分數充裕）

4. **個人申請 6 志願清單與橫向比對 (6-Choice Comparison)**
   - 模擬真實個人申請 6 個志願名額限制。
   - 一鍵開啟橫向對比矩陣，並排檢視檢定標準、篩選倍率、招收名額、歷年超篩級分。
   - 支援將志願清單一鍵匯出為標準 UTF-8 CSV 試算表或直接排版列印。

---

## 📁 檔案結構

```
taiwan-gsat-database/
├── index.html                    # 根目錄首頁（相容 GitHub Pages 一鍵直接發布，免 Build）
├── .nojekyll                     # 確保 GitHub Pages 靜態檔案完整輸出
├── .gitignore                    # Git 忽略檔案設定
├── .github/
│   └── workflows/
│       └── pages.yml             # GitHub Actions 自動部署工作流
├── css/
│   └── style.css                 # 現代化自適應樣式表（含深色/淺色主題、手機抽屜與觸控優化）
├── js/
│   ├── app.js                    # 主程式控制器與狀態管理
│   ├── filter.js                 # 多條件篩選引擎（含台灣大專院校與科系同義詞擴展）
│   ├── matcher.js                # 學測成績適配器（夢幻/目標/保底智能分類）
│   ├── wishlist.js               # 6 志願清單與橫向比對矩陣模組
│   └── export.js                 # UTF-8 BOM CSV 匯出與列印模組
├── data/
│   ├── departments.js            # 科系資料集 JS 封裝（window.GSAT_DEPARTMENTS，零 CORS / 本機直接開啟）
│   ├── schools.js                # 學校資料集 JS 封裝（window.GSAT_SCHOOLS）
│   ├── departments.min.json      # 壓縮版科系 JSON（2.7MB）
│   ├── departments.json          # 2,072 個科系完整詳細資料（包含三年標準、超篩與名額）
│   ├── schools.json              # 123 所公私立學校清單與地區屬性
│   └── taiwan_gsat.db            # SQLite3 關聯式資料庫（含索引）
├── scripts/
│   └── 01_fetch_and_compile.py   # 自動化爬蟲與資料庫編譯腳本
├── server.py                     # 本地 Python HTTP & REST API 伺服器
└── README.md                     # 本說明文件
```

---

## 🌐 GitHub Pages 發布步驟指南

本專案經過特殊架構設計，**不需要任何 Node.js / Webpack 編譯步驟**，只要推送至 GitHub，即可立即啟用 GitHub Pages 發布！

### 步驟一：初始化 Git 並推送到 GitHub

打開終端機並進入本專案資料夾：

```bash
cd taiwan-gsat-database

# 初始化 git
git init
git add .
git commit -m "feat: 發布全台大專院校近三年學測資料庫網站"

# 設定預設分支為 main
git branch -M main

# 關聯至您的 GitHub Repository（請將 USERNAME 與 REPO_NAME 換成您的帳號與倉庫名）
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

### 步驟二：開啟 GitHub Pages（兩種方式任選其一）

#### 方式 A：GitHub 內建分支發布（推薦，30秒完成）
1. 進入您在 GitHub 上的專案頁面。
2. 點擊頂部 **Settings**（設定）分頁。
3. 在左側選單點擊 **Pages**。
4. 在 **Build and deployment** 下方的 **Source** 選擇 **Deploy from a branch**。
5. 在 **Branch** 選取 `main` 分支與 `/(root)` 目錄，點擊 **Save**。
6. 等候約 1~2 分鐘，重新整理頁面，頂部即會顯示發布成功的專屬網址：  
   `https://<您的帳號>.github.io/<倉庫名稱>/`

#### 方式 B：GitHub Actions 自動部署
本專案已內建 `.github/workflows/pages.yml`：
1. 進入 GitHub 專案的 **Settings** -> **Pages**。
2. 在 **Build and deployment** 下方的 **Source** 切換為 **GitHub Actions**。
3. 每次推送到 `main` 分支時，GitHub 就會自動執行工作流並部署完成！

---

## 🚀 本地執行方式

### 方式一：直接雙擊開啟（離線零設定）

本專案資料集已透過 `data/schools.js` 與 `data/departments.js` 全域變數注入，**即使直接用瀏覽器雙擊開啟根目錄的 `index.html`（`file://` 協議）**，也不會受到瀏覽器 CORS 本機跨域安全性阻擋，完全離線秒開！

```bash
open index.html
```

### 方式二：透過本地 Python 伺服器（推薦）

在專案目錄下執行：

```bash
python3 server.py
```

終端機將顯示：
```
===========================================================
🎓 全台大專院校學測錄取資料庫 Web 伺服器已啟動
📍 本地網址: http://localhost:8080/
📁 網頁目錄: .../taiwan-gsat-database
💾 SQLite 資料庫: .../data/taiwan_gsat.db
===========================================================
```

開啟瀏覽器並造訪 [http://localhost:8080/](http://localhost:8080/) 即可使用。

---

## 💾 SQLite 資料庫查詢範例

資料庫儲存於 `data/taiwan_gsat.db`，可使用任何 SQLite 工具或 Python 查詢：

```python
import sqlite3

conn = sqlite3.connect('data/taiwan_gsat.db')
cur = conn.cursor()

# 查詢台大所有科系及 115 最新篩選門檻
cur.execute("""
    SELECT dep_name, quota, cutoff_summary 
    FROM departments 
    WHERE school_name = '國立臺灣大學'
    ORDER BY quota DESC
""")
for row in cur.fetchall():
    print(row)
```
