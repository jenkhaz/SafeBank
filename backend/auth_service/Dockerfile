FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

RUN pip install --upgrade pip

COPY auth_service/requirements.txt .
RUN pip install -r requirements.txt

COPY auth_service/app ./app
COPY auth_service/entrypoint.sh /entrypoint.sh
ENTRYPOINT ["sh", "/entrypoint.sh"]

COPY common ./common

EXPOSE 5000

CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
