import json
import re

# 1. 기존 JS 파일 읽기 (파일명은 실제 파일명에 맞게 수정하세요)
input_filename = 'hyobin_subway_light.js'
with open(input_filename, 'r', encoding='utf-8') as f:
    content = f.read()

# 2. JS 파일에서 순수 JSON 배열 부분만 추출
json_match = re.search(r'markers\s*:\s*(\[.*?\])\s*};?', content, re.DOTALL)
if not json_match:
    json_match = re.search(r'=\s*(\[.*?\])\s*;?', content, re.DOTALL)

raw_data = json.loads(json_match.group(1))

# 3. 분류할 빈 딕셔너리 생성
grouped_data = {
    "transfer_stations": [],        # 환승역
    "urban_heavy_1_2_3_4_6": [],    # 일반 중전철
    "light_rail_5_8": [],           # 경전철
    "tram_7": [],                   # 트램
    "regional_B": [],               # 광역철도(운영중)
    "urban_planned_c_y_A_G_9": [],  # 미개통 도시철도
    "regional_express_planned": [], # 미개통 광역급행 (HBA, HBB)
    "passenger_train": [],          # 여객철도 (R1, R3, H1)
    "freight_train": [],            # 화물철도 (R2, R4, R5, R6, R7)
    "campus_transit": [],           # 대학 내부 (T1, M1)
    "uncategorized": []             # 기타/오류
}

# 4. 데이터 분류 로직
for marker in raw_data:
    lines = marker.get("lines", [])
    active_lines = [l for l in lines if l != '7c'] # 7c 폐선 기호 제외
    
    if not active_lines:
        continue
        
    if len(active_lines) >= 2:
        grouped_data["transfer_stations"].append(marker)
    elif any(l in ['HBA', 'HBB'] for l in active_lines):
        grouped_data["regional_express_planned"].append(marker)
    elif any(l in ['c', 'y', 'A', 'G', '9'] for l in active_lines):
        grouped_data["urban_planned_c_y_A_G_9"].append(marker)
    elif any(l in ['R1', 'R3', 'H1'] for l in active_lines):
        grouped_data["passenger_train"].append(marker)
    elif any(l in ['R2', 'R4', 'R5', 'R6', 'R7'] for l in active_lines):
        grouped_data["freight_train"].append(marker)
    elif any(l in ['T1', 'M1'] for l in active_lines):
        grouped_data["campus_transit"].append(marker)
    elif '7' in active_lines:
        grouped_data["tram_7"].append(marker)
    elif any(l in ['5', '8'] for l in active_lines):
        grouped_data["light_rail_5_8"].append(marker)
    elif 'B' in active_lines:
        grouped_data["regional_B"].append(marker)
    elif any(l in ['1', '2', '3', '4', '6'] for l in active_lines):
        grouped_data["urban_heavy_1_2_3_4_6"].append(marker)
    else:
        grouped_data["uncategorized"].append(marker)

# 5. 보기 좋게 정렬된 새 JS 파일 생성
output_js = "const subwayData = {\n"
for category, markers in grouped_data.items():
    if markers:  # 데이터가 있는 카테고리만 출력
        # JSON.dumps를 사용하여 깔끔하게 들여쓰기(indent=4) 적용
        formatted_json = json.dumps(markers, ensure_ascii=False, indent=4)
        output_js += f"    // {category}\n"
        output_js += f"    {category}: {formatted_json},\n\n"
output_js += "};\n"

with open('hyobin_subway_formatted.js', 'w', encoding='utf-8') as f:
    f.write(output_js)

print("성공적으로 분류된 JS 파일이 'hyobin_subway_formatted.js'로 생성되었습니다.")