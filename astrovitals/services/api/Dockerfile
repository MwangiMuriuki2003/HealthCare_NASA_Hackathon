FROM python:3.11-slim

# Install minimal system deps needed
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m appuser

WORKDIR /app

# Copy only the source code - conda environment will be mounted from host
COPY app ./app

# Expose the port
EXPOSE 8000

# Entrypoint that activates the conda environment from host and runs the app
# This expects the conda environment to be available at /opt/conda/envs/ml-lab
# or we'll use a script to find and activate it
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV DATABASE_URL="postgresql://astro_user:password@localhost:5432/astronotes"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NEXTAUTH_SECRET="astra_vitals_nextauth_secret_change_this"
ENV ASTRA_API_KEYS=""
ENV ASTRA_ED25519_PRIVATE_KEY_B64=""
ENV ASTRA_ED25519_PUBLIC_KEY_B64=""

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]