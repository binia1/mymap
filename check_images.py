import os
import re
import glob

def check_missing_images(directory="."):
    # 1. HTML 파일과 JS 파일을 각각 안전하게 수집
    html_files = glob.glob(os.path.join(directory, "**", "*.html"), recursive=True)
    js_files = glob.glob(os.path.join(directory, "**", "*.js"), recursive=True)
    target_files = html_files + js_files
    
    # HTML용 <img> 태그 정규표현식
    img_pattern = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)
    
    # JS용 경로 추출 정규표현식 (따옴표 안에서 '이미지/' 폴더 경로가 포함되거나 이미지 확장자로 끝나는 문자열 탐색)
    js_img_pattern = re.compile(r'["\']([^"\']*(?:이미지/|/)[^"\']+\.(?:webp|png|jpg|jpeg|gif|svg))["\']', re.IGNORECASE)
    
    missing_reports = {}
    total_missing_count = 0

    print(f"🔍 총 {len(target_files)}개의 파일(HTML, JS)을 검사합니다...\n")

    for file_path in target_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                srcs = []
                # 파일 확장자에 따라 다른 정규표현식 적용
                if file_path.endswith('.html'):
                    srcs = img_pattern.findall(content)
                elif file_path.endswith('.js'):
                    raw_matches = js_img_pattern.findall(content)
                    for match in raw_matches:
                        srcs.append(match)
                
                for src in srcs:
                    # 외부 링크, Base64, 템플릿 변수 제외
                    if src.startswith(('http://', 'https://', 'data:')) or '${' in src:
                        continue
                        
                    file_dir = os.path.dirname(file_path)
                    path_from_file = os.path.normpath(os.path.join(file_dir, src))
                    path_from_root = os.path.normpath(os.path.join(directory, src))
                    
                    # 실제 이미지 파일 존재 여부 확인
                    if not (os.path.exists(path_from_file) or os.path.exists(path_from_root)):
                        if file_path not in missing_reports:
                            missing_reports[file_path] = []
                        if src not in missing_reports[file_path]:
                            missing_reports[file_path].append(src)
                            total_missing_count += 1
                            
        except Exception as e:
            print(f"⚠️ 파일을 읽는 중 오류 발생 ({file_path}): {e}")

    # 결과 보고서 저장
    report_filename = "누락된_이미지_보고서.txt"
    
    with open(report_filename, "w", encoding="utf-8") as report_file:
        if not missing_reports:
            success_msg = "✅ 완벽합니다! 검사한 모든 파일 내의 이미지가 정상적으로 연결되어 있습니다.\n"
            print(success_msg)
            report_file.write(success_msg)
        else:
            report_file.write("🚨 누락된 이미지 파일 목록 🚨\n")
            report_file.write("-" * 50 + "\n")
            for file_path, missing_imgs in missing_reports.items():
                report_file.write(f"📄 문서: {file_path}\n")
                for img in missing_imgs:
                    report_file.write(f"   ❌ 찾을 수 없음: {img}\n")
            report_file.write("-" * 50 + "\n")
            
            summary_msg = f"총 {len(missing_reports)}개의 파일에서 {total_missing_count}개의 이미지가 누락되었습니다."
            report_file.write(summary_msg + "\n")
            
            print(f"🚨 총 {total_missing_count}개의 이미지가 누락되었습니다.")
            print(f"📂 상세 결과는 동일한 폴더에 생성된 '{report_filename}' 파일을 열어 확인해 주세요!")

if __name__ == "__main__":
    check_missing_images(".")