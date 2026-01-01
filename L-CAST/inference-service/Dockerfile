FROM python:3.9-slim

WORKDIR /app

# 1. Install minimal system tools
RUN apt-get update && apt-get install -y \
    build-essential \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# 2. INSTALL PYTORCH CPU FIRST (Pinned & High Timeout)
# We pin version 2.2.2 to prevent metadata scanning and ensure a smaller download.
# We increase timeout to 3000s for slow connections.
RUN pip install --no-cache-dir --default-timeout=10000 \
    torch==2.2.2 \
    torchvision==0.17.2 \
    --index-url https://download.pytorch.org/whl/cpu

# 3. Install the rest
# sentence-transformers will see that torch is already installed and skip downloading the huge GPU version.
RUN pip install --no-cache-dir --default-timeout=10000 -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]