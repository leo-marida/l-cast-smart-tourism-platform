FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    curl \
    libffi-dev \
    libssl-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# FIX 1: Add timeout to the initial setup
RUN pip install --default-timeout=1000 --upgrade pip wheel setuptools

COPY requirements.txt .

# FIX 2: Add timeout to the massive PyTorch download (CPU version)
RUN pip install --default-timeout=1000 --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# FIX 3: Add timeout to the rest of the requirements
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]