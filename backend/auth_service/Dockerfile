FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN pip install --upgrade pip

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["sh", "/entrypoint.sh"]

COPY app ./app

EXPOSE 5000

CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
