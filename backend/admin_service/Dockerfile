FROM python:3.11-slim

WORKDIR /app

COPY admin_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY admin_service/app ./app
COPY common ./common

ENV PYTHONUNBUFFERED=1

COPY admin_service/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
