# Use an official lightweight Python image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your code
COPY . .

# Expose the port FastAPI will run on
EXPOSE 8080

# Run the app with uvicorn
# Note: we use 0.0.0.0 so it can accept external traffic
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]