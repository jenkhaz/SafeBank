FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

RUN pip install --upgrade pip

COPY accounts_service/requirements.txt .
RUN pip install -r requirements.txt

COPY accounts_service/app ./app

COPY common ./common

COPY accounts_service/entrypoint.sh /entrypoint.sh
ENTRYPOINT ["sh", "/entrypoint.sh"]

EXPOSE 5000

CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
