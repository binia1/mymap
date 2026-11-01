import os

project_dir = '.'
img_dir = '이미지'
exclude_dirs = {img_dir, '.git', 'node_modules'}

# 변경 이력을 저장할 장부 (문서 텍스트 치환용)
rename_map = {}

print("=== 1단계: 이미지 파일명 공백 안전 변환 시작 ===")
for root, dirs, files in os.walk(img_dir):
    for file in files:
        new_file = file.replace(' ', '_')
        
        # 1. 파일명에 공백이 있으면 우선 변경 시도
        if ' ' in file:
            old_path = os.path.join(root, file)
            new_path = os.path.join(root, new_file)
            
            if os.path.exists(new_path):
                print(f"[충돌 경고] '{new_file}' 파일이 이미 존재합니다! 덮어쓰기를 방지하기 위해 건너뜁니다.")
            else:
                os.rename(old_path, new_path)
                print(f"[이름 변경] '{file}' -> '{new_file}'")
        
        # 🚨 2. 핵심 해결 포인트: 방금 바꿨든 예전에 바꿨든 상관없이 '_'가 있는 파일은 모두 장부에 등록
        if '_' in new_file:
            # 문서 안에 ' ' (공백) 형태로 남아있을 경우를 찾기 위해 역추적 텍스트 생성
            space_version = new_file.replace('_', ' ')
            if space_version != new_file:
                rename_map[space_version] = new_file

print("\n=== 2단계: 기존 HTML/JS 문서 내 파일명 텍스트 동기화 시작 ===")
if rename_map:
    for root, dirs, files in os.walk(project_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for doc_file in files:
            if doc_file.endswith(('.html', '.js', '.css', '.json', '.md')):
                doc_path = os.path.join(root, doc_file)
                try:
                    with open(doc_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    modified = False
                    
                    # 🚨 장부에 등록된 모든 '공백 버전' 이름을 찾아 언더바 이름으로 강제 교체
                    for space_name, under_name in rename_map.items():
                        if space_name in content:
                            content = content.replace(space_name, under_name)
                            modified = True
                            
                    if modified:
                        with open(doc_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        print(f"[{doc_file}] 문서 안의 꼬인 공백 파일명 동기화 완료!")
                        
                except Exception as e:
                    print(f"[{doc_file}] 처리 중 오류: {e}")
    print("\n=== 완료: 안전하게 모든 작업이 끝났습니다. ===")
else:
    print("\n=== 완료: 이름에 공백이 있는 파일이 없거나, 모두 충돌하여 작업을 건너뛰었습니다. ===")