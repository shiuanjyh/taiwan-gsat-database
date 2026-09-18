#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Taiwan GSAT University Database - Local Web & API Server
Serves the responsive web frontend and provides SQLite REST endpoints.
"""

import os
import sys
import json
import sqlite3
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, 'web')
DB_PATH = os.path.join(BASE_DIR, 'data', 'taiwan_gsat.db')

class GSATServerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and caching headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        url_parts = urllib.parse.urlparse(self.path)
        path = url_parts.path
        query = urllib.parse.parse_qs(url_parts.query)

        # API Endpoints
        if path.startswith('/api/'):
            self.handle_api(path, query)
        else:
            super().do_GET()

    def handle_api(self, path, query):
        if not os.path.exists(DB_PATH):
            self.send_json_response({"error": "Database not initialized. Please run build script."}, status=500)
            return

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        try:
            if path == '/api/schools':
                cur.execute("SELECT * FROM schools ORDER BY school_key ASC")
                rows = [dict(r) for r in cur.fetchall()]
                self.send_json_response(rows)

            elif path == '/api/stats':
                cur.execute("SELECT COUNT(*) as total_deps FROM departments")
                total_deps = cur.fetchone()['total_deps']
                cur.execute("SELECT COUNT(*) as total_schools FROM schools")
                total_schools = cur.fetchone()['total_schools']
                cur.execute("SELECT SUM(quota) as total_quota FROM departments")
                total_quota = cur.fetchone()['total_quota']

                cur.execute("SELECT group_18, COUNT(*) as cnt FROM departments GROUP BY group_18 ORDER BY cnt DESC")
                group_dist = [dict(r) for r in cur.fetchall()]

                cur.execute("SELECT region, COUNT(*) as cnt FROM departments GROUP BY region ORDER BY cnt DESC")
                region_dist = [dict(r) for r in cur.fetchall()]

                self.send_json_response({
                    "total_departments": total_deps,
                    "total_schools": total_schools,
                    "total_quota": total_quota,
                    "groups": group_dist,
                    "regions": region_dist
                })

            elif path == '/api/departments':
                q = query.get('q', [''])[0].strip()
                group = query.get('group', [''])[0].strip()
                region = query.get('region', [''])[0].strip()
                school_type = query.get('type', [''])[0].strip()
                limit = int(query.get('limit', [100])[0])

                sql = "SELECT * FROM departments WHERE 1=1"
                params = []

                if q:
                    ALIASES = {
                        '台大': ['臺灣大學'], '臺大': ['臺灣大學'], '清大': ['清華大學'], '交大': ['陽明交通'],
                        '成大': ['成功大學'], '政大': ['政治大學'], '資工': ['資訊工程'], '資管': ['資訊管理'],
                        '電機': ['電機工程'], '機械': ['機械工程'], '化工': ['化學工程'], '材料': ['材料科學', '材料工程'],
                        '企管': ['企業管理'], '財金': ['財務金融'], '中文': ['中國文學'], '外文': ['外國語文', '英國語文']
                    }
                    tokens = [q]
                    for a, targets in ALIASES.items():
                        if a in q:
                            tokens.extend(targets)
                    
                    q_conditions = []
                    for t in tokens:
                        wildcard = f"%{t}%"
                        q_conditions.append("(school_name LIKE ? OR dep_name LIKE ? OR dep_id LIKE ?)")
                        params.extend([wildcard, wildcard, wildcard])
                    sql += f" AND ({' OR '.join(q_conditions)})"

                if group:
                    sql += " AND group_18 = ?"
                    params.append(group)

                if region:
                    sql += " AND region = ?"
                    params.append(region)

                if school_type:
                    sql += " AND school_type = ?"
                    params.append(school_type)

                sql += " ORDER BY estimated_score DESC LIMIT ?"
                params.append(limit)

                cur.execute(sql, params)
                raw_rows = cur.fetchall()
                results = []
                for r in raw_rows:
                    item = dict(r)
                    item['subjects'] = json.loads(item['subjects']) if item['subjects'] else []
                    item['standards'] = json.loads(item['standards_json']) if item['standards_json'] else {}
                    item['history'] = json.loads(item['history_json']) if item['history_json'] else []
                    del item['standards_json']
                    del item['history_json']
                    results.append(item)

                self.send_json_response(results)

            else:
                self.send_json_response({"error": "Endpoint not found"}, status=404)

        except Exception as e:
            self.send_json_response({"error": str(e)}, status=500)
        finally:
            conn.close()

    def send_json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

def run():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, GSATServerHandler)
    print(f"===========================================================")
    print(f"🎓 全台大專院校學測錄取資料庫 Web 伺服器已啟動")
    print(f"📍 本地網址: http://localhost:{PORT}/")
    print(f"📁 網頁目錄: {WEB_DIR}")
    print(f"💾 SQLite 資料庫: {DB_PATH}")
    print(f"===========================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n伺服器已安全關閉。")
        httpd.server_close()

if __name__ == '__main__':
    run()
