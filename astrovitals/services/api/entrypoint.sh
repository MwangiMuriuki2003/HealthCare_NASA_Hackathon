#!/bin/bash
set -e

# --- Find and activate the conda ml-lab environment ---
# Strategy: Check common conda locations on Fedora/CentOS/RedHat systems

CONDA_ENVS_DIRS=(
    "/opt/conda/envs"       # mambaforge/miniconda default
    "/home/appuser/miniconda3/envs"
    "/home/appuser/conda/envs"
)

ML_LAB_FOUND="false"

for ENVS_DIR in "${CONDA_ENVS_DIRS[@]}"; do
    if [ -d "$ENVS_DIR/ml-lab" ]; then
        echo "Found ml-lab conda environment at $ENVS_DIR/ml-lab"
        
        # Activate the environment
        source "$ENVS_DIR/ml-lab/bin/activate"
        ML_LAB_FOUND="true"
        break
    fi
done

if [ "$ML_LAB_FOUND" = "false" ]; then
    # Fallback: try to find conda and create the environment path
    echo "WARNING: ml-lab environment not found at common locations"
    
    # Try to find conda binary
    if command -v conda &>/dev/null; then
        echo "Found conda binary, attempting to activate ml-lab..."
        conda activate ml-lab 2>/dev/null || echo "Could not activate ml-lab via conda"
    elif command -v mamba &>/dev/null; then
        echo "Found mamba binary..."
        mamba activate ml-lab 2>/dev/null || echo "Could not activate ml-lab via mamba"
    else
        echo "No conda/mamba found - proceeding without environment activation"
    fi
fi

# --- Verify required packages are available ---
echo "Checking Python packages..."
python -c "import fastapi" && echo "fastapi: OK" || echo "fastapi: MISSING"
python -c "import uvicorn" && echo "uvicorn: OK" || echo "uvicorn: MISSING"
python -c "import sqlalchemy" && echo "sqlalchemy: OK" || echo "sqlalchemy: MISSING"
python -c "import pydantic" && echo "pydantic: OK" || echo "pydantic: MISSING"
python -c "import passlib" && echo "passlib: OK" || echo "passlib: MISSING"
python -c "import python_jose" && echo "python-jose: OK" || echo "python-jose: MISSING"
python -c "import aiokafka" && echo "aiokafka: OK" || echo "aiokafka: MISSING"
python -c "import redis" && echo "redis: OK" || echo "redis: MISSING"
python -c "import pendulum" && echo "pendulum: OK" || echo "pendulum: MISSING"

# --- Run the application ---
echo "Starting AstraVitals API server..."
exec uvicorn "app.main:app" --host "0.0.0.0" --port "8000"