FROM python:3.11-slim

WORKDIR /app

RUN pip install --upgrade pip

COPY audit_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY audit_service/app ./app
COPY audit_service/entrypoint.sh .
COPY common ./common

# Fix line endings and make entrypoint executable
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
