FROM python:3.9-slim

WORKDIR /app

# 1. Install minimal system tools
RUN apt-get update && apt-get install -y \
    build-essential \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# 2. INCREASED TIMEOUT: Added --default-timeout=1000 to prevent network crashes
# We still use the CPU version to keep it small (200MB vs 2GB)
RUN pip install --no-cache-dir --default-timeout=1000 torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 3. Install the rest
RUN pip install --no-cache-dir --default-timeout=1000 -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]