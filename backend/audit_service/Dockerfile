FROM python:3.11-slim

WORKDIR /app

RUN pip install --upgrade pip

COPY audit_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY audit_service/app ./app
COPY audit_service/entrypoint.sh .
COPY common ./common

# Make entrypoint executable
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
