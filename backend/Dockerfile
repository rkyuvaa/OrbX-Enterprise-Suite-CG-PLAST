FROM python:3.10-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install runtime PostgreSQL client library
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies with binary wheel preference
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

# Copy backend codebase
COPY . /app

EXPOSE 8000
