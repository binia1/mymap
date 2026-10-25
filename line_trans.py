import json
import re


def convert_lines():
    print("=== JS 객체/JSON 도로 데이터 x좌표(+19822) 자동 변환기 ===")
    print("데이터를 아래에 붙여넣고 엔터를 친 뒤, 마지막 줄에서 Ctrl+D(Linux/Mac) 또는 Ctrl+Z 후 엔터(Windows)를 누르세요:\n")

    # multi-line 입력 받기
    try:
        import sys

        raw_input = sys.stdin.read()
    except Exception as e:
        print(f"입력 오류: {e}")
        return

    if not raw_input.strip():
        print("입력된 데이터가 없습니다.")
        return

    # [x, y] 형태의 패턴을 찾아서 x 좌표에만 19822를 더해주는 함수
    def add_x_offset(match):
        x = int(match.group(1))
        y = int(match.group(2))
        return f"[{x + 19822}, {y}]"

    # 정규표현식을 이용하여 [숫자, 숫자] 형태 추출 및 변환 (음수, 양수 모두 지원)
    pattern = r"\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]"
    result = re.sub(pattern, add_x_offset, raw_input)

    print("\n" + "=" * 50)
    print(" [변환 완료된 데이터] ")
    print("=" * 50 + "\n")
    print(result)


if __name__ == "__main__":
    convert_lines()