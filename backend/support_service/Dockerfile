FROM python:3.11-slim

WORKDIR /app

COPY support_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY support_service/entrypoint.sh .
COPY support_service/app ./app
COPY common ./common

# Make entrypoint executable
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
