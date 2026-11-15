FROM python:3.12-slim AS builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml poetry.lock* ./
RUN pip install --no-cache-dir pip && pip install --no-cache-dir poetry && poetry config virtual.enabled false && poetry install --no-interaction --no-root

# Copy application code
COPY app/ ./app/

# ———————————————————————————————————————————————————————————
# Production stage
# ———————————————————————————————————————————————————————————

FROM python:3.12-slim AS production

WORKDIR /app

# Copy only installed packages and source from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /app ./app

# Set environment
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Expose FastAPI port
EXPOSE 8000

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]