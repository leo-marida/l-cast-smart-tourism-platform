FROM python:3.9-slim

WORKDIR /app

# 1. Install system tools
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 2. Upgrade pip
RUN pip install --upgrade pip

# 3. CRITICAL FIX: Force NumPy 1.x BEFORE installing PyTorch
# This prevents it from pulling the breaking NumPy 2.0 version
RUN pip install --default-timeout=10000 "numpy<2"

# 4. Install PyTorch (Pinned Version)
RUN pip install --default-timeout=10000 \
    torch==2.2.2 \
    torchvision==0.17.2 \
    --index-url https://download.pytorch.org/whl/cpu

# 5. Install the rest of the libraries
COPY requirements.txt .
RUN pip install --default-timeout=10000 -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]