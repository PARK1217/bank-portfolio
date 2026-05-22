FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지
# tzdata: python-slim 이미지에는 시간대 DB 가 빠져 있어 TZ=Asia/Seoul 환경변수만으로는
# `datetime.now()` 가 KST 로 동작하지 않음. tzdata 설치 후 TZ 만 설정해도 KST 가 적용된다.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    tzdata \
    && ln -fs /usr/share/zoneinfo/Asia/Seoul /etc/localtime \
    && echo "Asia/Seoul" > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Seoul

# 의존성
# torch CPU 휠을 받기 위해 PyTorch CPU 인덱스를 보조로 사용 (이미지 ~수백 MB 절감).
COPY requirements.txt .
RUN pip install --no-cache-dir \
        --extra-index-url https://download.pytorch.org/whl/cpu \
        -r requirements.txt

# 앱 코드 (volume으로 마운트되지만 빌드 시점에도 복사)
COPY app/ ./app/

EXPOSE 8000

# 핫리로드 활성화 (개발용)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]